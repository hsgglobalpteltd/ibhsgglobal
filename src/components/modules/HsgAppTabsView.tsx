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
} from "lucide-react";
import { showToast } from "@/lib/toast";

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

export interface HsgContestRecord {
  id: string;
  title: string;
  start_timestamp: number;
  end_timestamp: number;
  is_published: boolean;
  is_archived: boolean;
  poster_images: string[];
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
  user_phone: string;
  user_nickname: string;
  status: "submitted" | "winner" | "rejected";
  answer_json: Record<string, any>;
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

// Helper to upload image to storage
async function uploadAssetFile(file: File, folder = "hsgplus"): Promise<string> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${folder}/${Date.now()}_${cleanName}`;
  const res = await fetch(
    `${WORKER_URL}/api/upload?filename=${encodeURIComponent(fileName)}`,
    {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
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
  loading,
  onRefresh,
  openCreateTrigger,
}: {
  contests: HsgContestRecord[];
  submissions: HsgContestSubmission[];
  loading: boolean;
  onRefresh: () => void;
  openCreateTrigger?: number;
}) {
  const [leftTab, setLeftTab] = React.useState<"active" | "archive">("active");
  const [selectedContestId, setSelectedContestId] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Create / Edit Contest Modal
  const [showModal, setShowModal] = React.useState<boolean>(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<boolean>(false);

  const [title, setTitle] = React.useState<string>("");
  const [fpTitle, setFpTitle] = React.useState<string>("");
  const [fpDesc, setFpDesc] = React.useState<string>("");
  const [fpPhoto, setFpPhoto] = React.useState<string>("");
  const [posters, setPosters] = React.useState<string[]>([]);
  const [startDt, setStartDt] = React.useState<string>("");
  const [endDt, setEndDt] = React.useState<string>("");
  const [maxPerUser, setMaxPerUser] = React.useState<number>(1);
  const [totalCap, setTotalCap] = React.useState<number>(0);
  const [pointsPerSubmission, setPointsPerSubmission] =
    React.useState<number>(10);
  const [isPublished, setIsPublished] = React.useState<boolean>(true);
  const [questions, setQuestions] = React.useState<ContestQuestionItem[]>([]);

  const [uploadingCover, setUploadingCover] = React.useState<boolean>(false);
  const [uploadingPoster, setUploadingPoster] = React.useState<boolean>(false);

  // Submission Inspect / Winner Modal
  const [inspectSub, setInspectSub] = React.useState<HsgContestSubmission | null>(
    null
  );
  const [prizeNote, setPrizeNote] = React.useState<string>("1st Prize Winner");
  const [updatingSub, setUpdatingSub] = React.useState<boolean>(false);

  // Delete confirmation
  const [contestToDelete, setContestToDelete] =
    React.useState<HsgContestRecord | null>(null);

  React.useEffect(() => {
    if (openCreateTrigger && openCreateTrigger > 0) {
      handleOpenModal();
    }
  }, [openCreateTrigger]);

  const handleOpenModal = (prefill?: HsgContestRecord) => {
    if (prefill) {
      setEditingId(prefill.id);
      setTitle(prefill.title || "");
      setFpTitle(prefill.frontpage_config?.title || prefill.title || "");
      setFpDesc(prefill.frontpage_config?.description || "");
      setFpPhoto(prefill.frontpage_config?.cover_photo_url || "");
      setPosters(Array.isArray(prefill.poster_images) ? prefill.poster_images : []);
      setStartDt(toDatetimeLocal(prefill.start_timestamp));
      setEndDt(toDatetimeLocal(prefill.end_timestamp));
      setMaxPerUser(Number(prefill.submission_limits?.max_per_user ?? 1));
      setTotalCap(Number(prefill.submission_limits?.total_cap ?? 0));
      setPointsPerSubmission(
        Number(prefill.submission_limits?.points_per_submission ?? 0)
      );
      setIsPublished(Boolean(prefill.is_published));
      setQuestions(
        Array.isArray(prefill.submission_questions)
          ? prefill.submission_questions
          : []
      );
    } else {
      const now = Date.now();
      setEditingId(null);
      setTitle("");
      setFpTitle("");
      setFpDesc("");
      setFpPhoto("");
      setPosters([]);
      setStartDt(toDatetimeLocal(now));
      setEndDt(toDatetimeLocal(now + 4 * 3600000)); // Default 4-hour flash window
      setMaxPerUser(1);
      setTotalCap(0);
      setPointsPerSubmission(10);
      setIsPublished(true);
      setQuestions([
        {
          id: "q_photo",
          label: "Upload your contest photo proof",
          type: "photo_upload",
          required: true,
        },
        {
          id: "q_ig",
          label: "Your Instagram / TikTok Handle",
          type: "text",
          required: true,
        },
      ]);
    }
    setShowModal(true);
  };

  const handleUploadFrontPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadAssetFile(file, "hsgplus_contest");
      setFpPhoto(url);
      showToast("Frontpage photo uploaded", "success");
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadPosterFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (posters.length + files.length > 8) {
      showToast("Maximum 8 poster images allowed per contest", "error");
      return;
    }
    setUploadingPoster(true);
    try {
      const uploadedUrls: string[] = [];
      for (const f of files) {
        const u = await uploadAssetFile(f, "hsgplus_contest_posters");
        uploadedUrls.push(u);
      }
      setPosters((prev) => [...prev, ...uploadedUrls].slice(0, 8));
      showToast(`Uploaded ${uploadedUrls.length} poster image(s)`, "success");
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleMovePoster = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= posters.length) return;
    setPosters((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = temp;
      return copy;
    });
  };

  const handleSaveContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please enter a Contest Title", "error");
      return;
    }
    setSaving(true);
    try {
      const startMs = startDt ? new Date(startDt).getTime() : Date.now();
      const endMs = endDt ? new Date(endDt).getTime() : startMs + 4 * 3600000;

      const res = await fetch(`${WORKER_URL}/api/hsg-app/contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          title: title.trim(),
          start_timestamp: startMs,
          end_timestamp: endMs,
          is_published: isPublished,
          is_archived: false,
          poster_images: posters.slice(0, 8),
          frontpage_config: {
            title: fpTitle.trim() || title.trim(),
            description: fpDesc.trim(),
            cover_photo_url: fpPhoto || posters[0] || "",
          },
          submission_limits: {
            max_per_user: Number(maxPerUser || 1),
            total_cap: Number(totalCap || 0),
            points_per_submission: Number(pointsPerSubmission || 0),
          },
          submission_questions: questions,
        }),
      });
      if (!res.ok) throw new Error("Failed to save contest");
      showToast("Contest saved successfully", "success");
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to save contest", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePatchContest = async (
    c: HsgContestRecord,
    patch: Partial<HsgContestRecord>
  ) => {
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/${encodeURIComponent(c.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      if (!res.ok) throw new Error("Update failed");
      showToast("Contest updated", "success");
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to update contest", "error");
    }
  };

  const handleDeleteContest = async () => {
    if (!contestToDelete) return;
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/${encodeURIComponent(contestToDelete.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      showToast("Contest deleted", "success");
      setContestToDelete(null);
      if (selectedContestId === contestToDelete.id) setSelectedContestId("ALL");
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const handleUpdateSubmissionStatus = async (
    status: "winner" | "rejected" | "submitted"
  ) => {
    if (!inspectSub) return;
    setUpdatingSub(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/submissions/${encodeURIComponent(
          inspectSub.id
        )}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            winner_data:
              status === "winner"
                ? {
                    is_winner: true,
                    prize_note: prizeNote,
                    awarded_at: Date.now(),
                  }
                : { is_winner: false },
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update submission");
      showToast(
        status === "winner" ? "Marked as Contest Winner!" : "Submission updated",
        "success"
      );
      setInspectSub(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Update failed", "error");
    } finally {
      setUpdatingSub(false);
    }
  };

  const visibleContests = contests.filter((c) =>
    leftTab === "active" ? !c.is_archived : c.is_archived
  );

  const filteredSubs = submissions.filter((s) => {
    if (selectedContestId !== "ALL" && s.contest_id !== selectedContestId)
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (s.user_nickname || "").toLowerCase().includes(q) ||
        (s.user_phone || "").includes(q) ||
        JSON.stringify(s.answer_json || {})
          .toLowerCase()
          .includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* LEFT 32%: CONTEST CAMPAIGNS */}
      <section className="w-[32%] min-w-[320px] max-w-[420px] h-full border-r border-slate-200 flex flex-col bg-slate-50/40 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 flex-1">
            <button
              type="button"
              onClick={() => setLeftTab("active")}
              className={`h-7 rounded-md text-xs font-bold transition ${
                leftTab === "active"
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Active Contests
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("archive")}
              className={`h-7 rounded-md text-xs font-bold transition ${
                leftTab === "archive"
                  ? "bg-white text-zinc-950 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Archive
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1 shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#0B57D0]" />
              <span>Loading contests...</span>
            </div>
          ) : visibleContests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-xs text-zinc-500">
              No {leftTab} contests found. Click{" "}
              <span className="font-bold text-[#0B57D0]">+ New</span> to create a
              vertical poster contest.
            </div>
          ) : (
            visibleContests.map((c) => {
              const isSelected = selectedContestId === c.id;
              const isLive = Boolean(c.is_published && !c.is_archived);
              const subCount = submissions.filter((s) => s.contest_id === c.id).length;
              const cap = c.submission_limits?.total_cap || 0;

              return (
                <div
                  key={c.id}
                  onClick={() =>
                    setSelectedContestId((prev) => (prev === c.id ? "ALL" : c.id))
                  }
                  className={`p-3 rounded-lg border transition cursor-pointer bg-white flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? "border-[#0B57D0] ring-2 ring-[#0B57D0]/20 bg-blue-50/15 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 shadow-xs"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-zinc-950 truncate">
                        {c.title}
                      </h3>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isLive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-zinc-500"
                        }`}
                      >
                        {isLive ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {c.frontpage_config?.title || "No frontpage title"} •{" "}
                      {(c.poster_images || []).length}/8 Posters •{" "}
                      {cap > 0 ? `${subCount}/${cap} Entries` : `${subCount} Entries`}
                      {Number(c.submission_limits?.points_per_submission || 0) >
                        0 && (
                        <span className="font-bold text-[#0B57D0]">
                          {" "}
                          • +{c.submission_limits?.points_per_submission} pts/entry
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 min-w-0 truncate">
                      <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {formatDateTime(c.start_timestamp)} –{" "}
                        {formatDateTime(c.end_timestamp)}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {leftTab === "active" ? (
                        <>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isLive}
                            onClick={() =>
                              handlePatchContest(c, { is_published: !isLive })
                            }
                            title={isLive ? "Click to unpublish" : "Click to publish"}
                            className={`w-8 h-5 rounded-full transition-colors relative flex items-center p-[2px] cursor-pointer shrink-0 ${
                              isLive
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-slate-300 hover:bg-slate-400"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                                isLive ? "translate-x-3" : "translate-x-0"
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenModal(c)}
                            title="Edit Contest"
                            className="w-5 h-5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 flex items-center justify-center"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isLive}
                            onClick={() =>
                              handlePatchContest(c, {
                                is_archived: true,
                                is_published: false,
                              })
                            }
                            title={
                              isLive
                                ? "Unpublish before archiving"
                                : "Move to Archive"
                            }
                            className={`w-5 h-5 rounded flex items-center justify-center ${
                              isLive
                                ? "border border-slate-200 bg-slate-100 text-zinc-300 opacity-50 cursor-not-allowed"
                                : "border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600"
                            }`}
                          >
                            <Archive className="w-2.5 h-2.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handlePatchContest(c, {
                                is_archived: false,
                                is_published: false,
                              })
                            }
                            title="Restore Contest"
                            className="w-5 h-5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 flex items-center justify-center"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setContestToDelete(c)}
                            title="Delete Contest"
                            className="w-5 h-5 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* RIGHT 68%: CONTEST SUBMISSIONS TABLE */}
      <section className="flex-1 h-full flex flex-col bg-white overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900">
              Contest Submissions
            </span>
            {selectedContestId !== "ALL" && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0B57D0]/10 text-[#0B57D0] flex items-center gap-1.5">
                <span>
                  {contests.find((c) => c.id === selectedContestId)?.title ||
                    selectedContestId}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedContestId("ALL")}
                  className="w-3.5 h-3.5 rounded-full bg-[#0B57D0]/20 hover:bg-[#0842A0] hover:text-white flex items-center justify-center text-[10px]"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search participant, phone, answer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 w-60 rounded-lg bg-white border border-slate-200 text-xs outline-none focus:border-[#0B57D0]"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#F8F9FA] border-b border-slate-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Participant</th>
                <th className="py-2.5 px-4">Contest</th>
                <th className="py-2.5 px-4">Submitted Answers</th>
                <th className="py-2.5 px-4">Submitted At</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No contest submissions found.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const contestObj = contests.find((c) => c.id === sub.contest_id);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">
                          {sub.user_nickname}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          +{maskPhoneLast4(sub.user_phone)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-800">
                        {contestObj?.title || sub.contest_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 max-w-[260px]">
                          {Object.entries(sub.answer_json || {})
                            .slice(0, 2)
                            .map(([k, v]) => (
                              <div key={k} className="text-[11px] truncate">
                                <span className="text-zinc-500 font-mono">{k}:</span>{" "}
                                <span className="font-semibold text-zinc-900">
                                  {Array.isArray(v) ? v.join(", ") : String(v)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {formatDateTime(sub.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        {sub.status === "winner" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-zinc-800 font-medium text-[11px] border border-slate-300">
                            <Award className="w-3 h-3" />{" "}
                            {sub.winner_data?.prize_note || "Winner"}
                          </span>
                        ) : sub.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 text-zinc-500 font-medium text-[11px] border border-slate-200">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] font-bold text-[11px] border border-blue-200">
                            Submitted
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectSub(sub);
                            setPrizeNote(
                              sub.winner_data?.prize_note || "1st Prize Winner"
                            );
                          }}
                          className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-800 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-zinc-500" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE / EDIT CONTEST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-zinc-950">
                {editingId ? "Edit Campaign Contest" : "Create Campaign Contest"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveContest}
              className="flex-1 min-h-0 overflow-y-auto p-6 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT COLUMN: GENERAL INFO & SCHEDULE */}
                <div className="space-y-4">
                  <div className="text-xs font-bold text-zinc-900 border-b border-slate-100 pb-1.5">
                    Contest Details
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Internal Contest Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Marina Bay 4-Hour Flash Contest"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none font-semibold focus:border-[#0B57D0]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Frontpage Display Title
                    </label>
                    <input
                      type="text"
                      value={fpTitle}
                      onChange={(e) => setFpTitle(e.target.value)}
                      placeholder="e.g. 4-Hour Flash Drop: Win $100 Cash!"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none font-semibold focus:border-[#0B57D0]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Frontpage Description
                    </label>
                    <input
                      type="text"
                      value={fpDesc}
                      onChange={(e) => setFpDesc(e.target.value)}
                      placeholder="e.g. Scroll down the poster & submit your photo!"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                  </div>

                  {/* Frontpage Cover Photo */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Frontpage Cover Photo
                    </label>
                    {fpPhoto ? (
                      <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50">
                        <img
                          src={fpPhoto}
                          alt="Frontpage Cover"
                          className="w-14 h-14 rounded-md object-cover bg-white border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0 font-mono text-[11px] text-zinc-500 truncate">
                          {fpPhoto}
                        </div>
                        <button
                          type="button"
                          onClick={() => setFpPhoto("")}
                          className="px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#0B57D0] rounded-lg p-3.5 cursor-pointer bg-slate-50/70 transition">
                        {uploadingCover ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#0B57D0]" />
                        ) : (
                          <span className="text-xs font-semibold text-[#0B57D0] flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" /> Upload Cover Photo
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadFrontPhoto}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="text-xs font-bold text-zinc-900 border-b border-slate-100 pb-1.5 pt-2">
                    Schedule & Settings
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">
                        Points (pts)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={pointsPerSubmission}
                        onChange={(e) =>
                          setPointsPerSubmission(Number(e.target.value))
                        }
                        placeholder="0"
                        className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-bold text-[#0B57D0]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">
                        Max / User
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
                        Total Cap
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={totalCap}
                        onChange={(e) => setTotalCap(Number(e.target.value))}
                        placeholder="0 = unlim"
                        className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-bold"
                      />
                    </div>
                  </div>

                  {/* Minimal Toggle Switch for Published Status */}
                  <div className="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <div className="font-semibold text-zinc-800">Publish Status</div>
                      <div className="text-[11px] text-zinc-400">
                        {isPublished ? "Visible in community app" : "Hidden in draft state"}
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
                </div>

                {/* RIGHT COLUMN: POSTERS & QUESTIONS */}
                <div className="space-y-4">
                  {/* Posters */}
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                      <div className="text-xs font-bold text-zinc-900">
                        Vertical Posters ({posters.length}/8)
                      </div>
                      {posters.length < 8 && (
                        <label className="h-7 px-2.5 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition">
                          {uploadingPoster ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploadingPoster}
                            onChange={handleUploadPosterFiles}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {posters.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-zinc-400 text-xs">
                        No poster images uploaded yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {posters.map((url, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex flex-col"
                          >
                            <div className="relative aspect-[4/5] bg-white overflow-hidden">
                              <img
                                src={url}
                                alt={`Poster ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-zinc-900/80 text-white text-[9px] font-bold">
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="p-1 bg-white border-t border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMovePoster(idx, -1)}
                                  className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center disabled:opacity-30"
                                >
                                  <ArrowUp className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === posters.length - 1}
                                  onClick={() => handleMovePoster(idx, 1)}
                                  className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center disabled:opacity-30"
                                >
                                  <ArrowDown className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPosters((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="w-5 h-5 rounded text-red-600 hover:bg-red-50 flex items-center justify-center"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Questions */}
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                      <div className="text-xs font-bold text-zinc-900">
                        Submission Questions ({questions.length})
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setQuestions((prev) => [
                            ...prev,
                            {
                              id: `q_${Date.now().toString().slice(-4)}`,
                              label: "New Question",
                              type: "text",
                              required: true,
                            },
                          ])
                        }
                        className="h-7 px-2.5 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Question</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                        >
                          <div className="grid grid-cols-12 gap-1.5 items-center">
                            <div className="col-span-7">
                              <input
                                type="text"
                                value={q.label}
                                onChange={(e) =>
                                  setQuestions((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, label: e.target.value } : item
                                    )
                                  )
                                }
                                placeholder="Question label..."
                                className="w-full h-7 px-2 rounded-md bg-white border border-slate-200 text-xs font-semibold outline-none"
                              />
                            </div>
                            <div className="col-span-4">
                              <select
                                value={q.type}
                                onChange={(e) =>
                                  setQuestions((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            type: e.target
                                              .value as ContestQuestionItem["type"],
                                          }
                                        : item
                                    )
                                  )
                                }
                                className="w-full h-7 px-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold outline-none"
                              >
                                <option value="text">Text Input</option>
                                <option value="photo_upload">Photo Upload</option>
                                <option value="radio_select">Radio Select</option>
                                <option value="multi_select">Multi Select</option>
                                <option value="range_number">Range (1–10)</option>
                              </select>
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setQuestions((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="w-6 h-6 rounded text-red-500 hover:bg-red-50 flex items-center justify-center"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {(q.type === "radio_select" || q.type === "multi_select") && (
                            <input
                              type="text"
                              value={(q.options || []).join(", ")}
                              onChange={(e) => {
                                const opts = e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                setQuestions((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, options: opts } : item
                                  )
                                );
                              }}
                              placeholder="Comma-separated options (Option A, Option B)"
                              className="w-full h-7 px-2 rounded-md bg-white border border-slate-200 text-xs outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-end gap-2">
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
                  className="h-8 px-5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5 transition"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Contest</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT SUBMISSION & AWARD WINNER MODAL */}
      {inspectSub && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  Contest Entry ({inspectSub.id})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {inspectSub.user_nickname} (+{maskPhoneLast4(inspectSub.user_phone)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectSub(null)}
                className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[10px] font-bold uppercase text-zinc-400">
                  Submitted Contest Answers:
                </div>
                {Object.entries(inspectSub.answer_json || {}).map(([k, v]) => (
                  <div key={k} className="space-y-1">
                    <div className="text-[11px] font-mono text-zinc-500">{k}:</div>
                    {typeof v === "string" &&
                    (v.startsWith("http://") || v.startsWith("https://")) ? (
                      <img
                        src={v}
                        alt={k}
                        className="w-full h-40 object-contain rounded-md bg-white border border-slate-200"
                      />
                    ) : (
                      <div className="font-bold text-zinc-900">
                        {Array.isArray(v) ? v.join(", ") : String(v)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block font-semibold text-zinc-700">
                  Winner Prize Label:
                </label>
                <input
                  type="text"
                  value={prizeNote}
                  onChange={(e) => setPrizeNote(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-semibold outline-none"
                />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={updatingSub}
                    onClick={() => handleUpdateSubmissionStatus("winner")}
                    className="h-9 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Award Winner</span>
                  </button>
                  <button
                    type="button"
                    disabled={updatingSub}
                    onClick={() => handleUpdateSubmissionStatus("rejected")}
                    className="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Entry</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONTEST CONFIRMATION */}
      {contestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5">
            <h3 className="text-sm font-bold text-zinc-950">
              Delete Contest Permanently?
            </h3>
            <p className="text-xs text-zinc-600 mt-2">
              Are you sure you want to delete{" "}
              <strong className="text-zinc-900">{contestToDelete.title}</strong>?
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
    setSavingAnn(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/news/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAnnId || undefined,
          title: annTitle.trim(),
          body: annBody.trim(),
          is_pinned: annPinned,
          is_hidden: annHidden,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      handleResetAnnForm();
      showToast(
        editingAnnId ? "Announcement updated successfully" : "Announcement published",
        "success"
      );
      onRefresh();
    } catch {
      showToast("Failed to save announcement", "error");
    } finally {
      setSavingAnn(false);
    }
  };

  const handleToggleAnnVisibility = async (a: HsgAnnouncementRecord) => {
    const nextHidden = !a.is_hidden;
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
      showToast(
        nextHidden ? "Announcement hidden from mobile app" : "Announcement is now visible in mobile app",
        "success"
      );
      onRefresh();
    } catch {
      showToast("Failed to update visibility", "error");
    }
  };

  const handleToggleAnnPinned = async (a: HsgAnnouncementRecord) => {
    const nextPinned = !a.is_pinned;
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
      showToast(nextPinned ? "Announcement pinned to top" : "Announcement unpinned", "success");
      onRefresh();
    } catch {
      showToast("Failed to update pin status", "error");
    }
  };

  const handleDeleteAnn = async (id: string) => {
    try {
      await fetch(
        `${WORKER_URL}/api/hsg-app/news/announcements/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (editingAnnId === id) handleResetAnnForm();
      showToast("Announcement deleted", "success");
      onRefresh();
    } catch {
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
    setSavingHl(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/news/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingHlId || undefined,
          brand_name: hlBrand.trim(),
          title: hlTitle.trim(),
          subtitle: hlSubtitle.trim(),
          post_url: hlPostUrl.trim(),
          external_link: hlPostUrl.trim(),
          image_url: hlImg,
          is_hidden: hlHidden,
          order_seq: highlights.length + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      handleResetHlForm();
      showToast(
        editingHlId ? "Highlight card updated" : "Highlight card added",
        "success"
      );
      onRefresh();
    } catch {
      showToast("Failed to save highlight", "error");
    } finally {
      setSavingHl(false);
    }
  };

  const handleToggleHlVisibility = async (h: HsgHighlightRecord) => {
    const nextHidden = !h.is_hidden;
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
      showToast(
        nextHidden ? "Highlight hidden from mobile app" : "Highlight is now visible in mobile app",
        "success"
      );
      onRefresh();
    } catch {
      showToast("Failed to update visibility", "error");
    }
  };

  const handleDeleteHl = async (id: string) => {
    try {
      await fetch(
        `${WORKER_URL}/api/hsg-app/news/highlights/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (editingHlId === id) handleResetHlForm();
      showToast("Highlight deleted", "success");
      onRefresh();
    } catch {
      showToast("Failed to delete highlight", "error");
    }
  };

  // Filtered lists
  const filteredAnnouncements = announcements.filter((a) => {
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

  const filteredHighlights = highlights.filter((h) => {
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
  const visibleAppAnnouncements = announcements.filter((a) => !a.is_hidden);
  const visibleAppHighlights = highlights.filter((h) => !h.is_hidden);

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
              <div className="h-7 rounded border border-slate-200 flex overflow-hidden">
                <div
                  className="flex-1 flex items-center justify-center text-[10px] font-bold text-zinc-900"
                  style={{ backgroundColor: themeColor1 }}
                >
                  Primary
                </div>
                <div
                  className="flex-1 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: themeColor2 }}
                >
                  Accent
                </div>
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

  // Dedicated HSG+ Shop Catalog Items (100% strictly separate from master products DB)
  const allCatalogItems = React.useMemo(() => {
    return (merch || []).map((m: any) => ({
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
  }, [merch]);

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
    setSavingMerch(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/merch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMerchId || undefined,
          name: merchName.trim(),


          category: merchCategory.trim() || "General",
          redeem_mode: merchRedeemMode,

          price_cashback: Number(merchPrice) || 0,
          price_points: merchPoints ? Number(merchPoints) : (Number(merchPrice) ? Math.round(Number(merchPrice) * 10) : 0),
          stock_qty: Number(merchStock) || 0,
          image_url: merchImg,
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      handleResetMerchForm();
      showToast(
        editingMerchId ? "Product updated" : "Product added to shop catalog",
        "success"
      );
      onRefresh();
    } catch {
      showToast("Failed to save product", "error");
    } finally {
      setSavingMerch(false);
    }
  };

  const handleDeleteMerch = async (id: string) => {
    try {
      await fetch(`${WORKER_URL}/api/hsg-app/merch/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (editingMerchId === id) handleResetMerchForm();
      showToast("Product removed from catalog", "success");
      onRefresh();
    } catch {
      showToast("Failed to remove product", "error");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/merch-orders/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Order marked as ${newStatus}`, "success");
      if (inspectOrder && inspectOrder.id === orderId) {
        setInspectOrder({ ...inspectOrder, status: newStatus });
      }
      onRefresh();
    } catch {
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
    return orders.filter((o) => {
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
  }, [orders, fulfillmentFilter, statusFilter, orderSearch]);

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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredCatalog.map((m) => {
                  const mode = m.redeem_mode || "both";
                  const cat = m.category || "Product";
                  const pts = m.price_points;
                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col justify-between shadow-2xs hover:border-slate-300 transition"
                    >
                      <div>
                        <div className="relative w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                          {m.image_url ? (
                            <img
                              src={m.image_url}
                              alt={m.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="w-8 h-8 text-slate-300" />
                          )}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/95 text-slate-800 border border-slate-200 shadow-2xs">
                              {cat}
                            </span>
                          </div>
                          
                        </div>

                        <div className="p-3 space-y-1">
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

                      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px]">
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
