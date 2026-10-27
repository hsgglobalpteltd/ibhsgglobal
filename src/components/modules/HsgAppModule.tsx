"use client";

import * as React from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Calendar,
  Search,
  Eye,
  Archive,
  Store,
  Tag,
  Check,
  XCircle,
  Lock,
  Upload,
  Image as ImageIcon,
  Pencil,
  RotateCcw,
  Clock,
  ExternalLink,
  History,
  MapPin,
  AlertTriangle,
  Play,
  Copy,
  FileText,
  CheckSquare,
  Square,
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { NavigationTabs, TabItem } from "../navigation-tabs";
import { UserProfile } from "@/lib/api";
import { HsgOverviewTab } from "./HsgOverviewTab";
import {
  HsgContestTab,
  HsgMembersTab,
  HsgNewsTab,
  HsgEventsTab,
  HsgSettingsTab,
  HsgShopTab,
  HsgTransactionsTab,
  HsgTransactionRecord,
  HsgContestRecord,
  HsgContestSubmission,
  HsgWithdrawalRecord,
  HsgUserRecord,
  HsgAnnouncementRecord,
  HsgHighlightRecord,
  HsgEventRecord,
  HsgEventRsvpRecord,
  HsgMerchRecord,
} from "./HsgAppTabsView";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

export type CashbackPurchaseMode = "flat" | "percentage" | "points";
export type MilestoneRewardType =
  | "extra_cash"
  | "extra_percent"
  | "extra_points"
  | "free_merch";
export type CashbackTaskType =
  | "range_number"
  | "text"
  | "radio_select"
  | "multi_select";

export interface StoreVisitMilestone {
  step: number;
  target_stores: number;
  reward_type: MilestoneRewardType;
  reward_value?: number;
  reward_label: string;
}

export interface CashbackTaskItem {
  id: string;
  title: string;
  question: string;
  type: CashbackTaskType;
  options?: string[];
  min_range?: number;
  max_range?: number;
  note?: string;
  required?: boolean;
  is_system_core?: boolean;
  is_active?: boolean;
}

export interface StoreMovementItem {
  outlet_id: string;
  outlet_name: string;
  address: string;
  total_audits: number;
  avg_movement: number;
  total_qty_sold: number;
  last_audit_at: number;
}

export interface CashbackCampaign {
  id: string;
  campaign_name: string;
  title?: string;
  brand?: string;
  brand_id: string;
  brand_name: string;
  product_id: string;
  product_name: string;
  product_image_url: string;
  unit_label: string;
  purchase_reward_mode: CashbackPurchaseMode;
  cashback_amount: number;
  reward_type?: "cashback" | "points" | "both";
  reward_cash?: number;
  reward_points?: number;
  unlock_rewards?: { tier: number; stores: number; reward: string; cash?: number; points?: number }[];
  velocity_task_enabled?: boolean;
  custom_questions?: { id: string; question: string }[];
  instructions?: string;
  rules?: string;
  poster_url?: string;
  start_time?: string;
  end_time?: string;
  min_qty: number;
  where_to_buy: string;
  display_title: string;
  display_description: string;
  description?: string;
  cta_text: string;
  promo_card_url?: string;
  banner_image_url: string;
  start_timestamp: number;
  end_timestamp: number;
  is_active: boolean;
  is_archived: boolean;
  display_order?: number;
  enable_milestones: boolean;
  store_visit_milestones: StoreVisitMilestone[];
  visited_store_ids: string[];
  enable_movement_task?: boolean;
  task_title: string;
  task_question: string;
  task_note: string;
  tasks?: CashbackTaskItem[];
  created_at?: number;
  updated_at?: number;
}

export interface CashbackClaimRecord {
  id: string;
  user_phone: string;
  user_nickname: string;
  campaign_id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  qty: number;
  total_qty?: number;
  receipt_amount: number;
  total_purchase?: number;
  cashback_amount: number;
  reward_given?: string | { cashback?: number; points?: number; cash?: number };
  reward?: { cashback?: number; points?: number; cash?: number; type?: string };
  diagnose_status?: string;
  assign_store_id?: string;
  answers?: Record<string, any>;
  ocr_data?: {
    transaction_ref?: string;
    purchase_datetime?: string;
    store_name?: string;
    store_address?: string;
    assign_store_id?: string;
    [key: string]: any;
  };
  transaction_id: string;
  raw_address: string;
  matched_outlet_id: string;
  matched_outlet_name: string;
  receipt_photo_url: string;
  receipt_url?: string;
  status: "pending" | "credited" | "approved" | "rejected";
  rejection_reason?: string;
  cashier_task_qty?: number;
  task_answers?: Record<string, any>;
  raw_ocr_data?: Record<string, any>;
  answer_json?: Record<string, any>;
  verify?: Record<string, any>;
  withdrawal_transaction?: Record<string, any>;
  timestamp: number;
  logs?: any[];
  edited_by_admin?: boolean;
  created_at?: number;
}

export interface HsgStoreOutlet {
  id: string;
  store_name: string;
  store_address: string;
  brand?: string;
  is_active?: boolean;
  created_at?: number;
  updated_at?: number;
}

export interface HsgStoreRecord {
  id: string;
  store_entity: string;
  outlet_id: string;
  display_name: string;
  store_address: string;
  created_at?: number;
}

function normalizeAddressTokens(addr: string): string[] {
  return (addr || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !["singapore", "sg", "rd", "road", "ave", "avenue", "st", "street", "blvd", "dr", "drive", "mall", "hub", "point", "the"].includes(w));
}

function calculateAddressSimilarity(addr1: string, addr2: string): number {
  const words1 = normalizeAddressTokens(addr1);
  const words2 = normalizeAddressTokens(addr2);
  if (words1.length === 0 || words2.length === 0) return 0;
  let common = 0;
  for (const w1 of words1) {
    if (words2.some((w2) => w2 === w1 || (w1.length > 3 && (w2.includes(w1) || w1.includes(w2))))) {
      common++;
    }
  }
  return (2 * common) / (words1.length + words2.length);
}

function findBestStoreMatch(rawAddress: string, storeList: HsgStoreRecord[]): { store: HsgStoreRecord; score: number } | null {
  if (!rawAddress || storeList.length === 0) return null;
  let best: { store: HsgStoreRecord; score: number } | null = null;
  const rawNorm = rawAddress.toLowerCase();

  for (const st of storeList) {
    let score = calculateAddressSimilarity(rawAddress, st.store_address);
    if (st.store_entity && rawNorm.includes(st.store_entity.toLowerCase())) {
      score += 0.25;
    }
    if (st.outlet_id && rawNorm.includes(st.outlet_id.toLowerCase())) {
      score += 0.40;
    }
    const nameScore = calculateAddressSimilarity(rawAddress, st.display_name);
    score = Math.max(score, nameScore * 1.1);
    score = Math.min(1, score);

    if (score >= 0.70 && (!best || score > best.score)) {
      best = { store: st, score };
    }
  }
  return best;
}

// Helper to format any timestamp or ISO string into local YYYY-MM-DDTHH:mm for datetime-local input
const formatForDateTimeLocal = (val: any) => {
  if (!val) return "";
  let ts = Number(val);
  if (isNaN(ts) || ts <= 0) {
    ts = new Date(val).getTime();
  }
  if (isNaN(ts) || ts <= 0) return "";
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface HsgAppModuleProps {
  profile?: UserProfile | null;
  idToken?: string;
}

export function HsgAppModule({ profile }: HsgAppModuleProps) {
  // Top bar navigation tabs - 6 dedicated pillars
  const [activeTab, setActiveTab] = React.useState<string>("Dashboard");
  const [cashbackSubTab, setCashbackSubTab] = React.useState<"queue" | "campaigns" | "store_outlets">("queue");
  const [shopSubTab, setShopSubTab] = React.useState<"catalog" | "orders">("catalog");
  const [communitySubTab, setCommunitySubTab] = React.useState<"events" | "contests" | "news">("events");
  const [membersSubTab, setMembersSubTab] = React.useState<"members" | "withdrawals" | "network">("members");

  const topTabs: TabItem[] = [
    { id: "Dashboard", label: "Overview" },
    { id: "Cashback", label: "Cashback" },
    { id: "Shop", label: "Shop" },
    { id: "Community", label: "Community" },
    { id: "Members", label: "Members" },
    { id: "Settings", label: "Settings" },
  ];

  // Data states (100% Live from Database via Backend Worker)
  const [campaigns, setCampaigns] = React.useState<CashbackCampaign[]>([]);
  // Registered Stores Directory & Diagnostic States
  const [stores, setStores] = React.useState<HsgStoreRecord[]>([]);
  const [storeOutlets, setStoreOutlets] = React.useState<HsgStoreOutlet[]>([]);
  const [storeOutletSearch, setStoreOutletSearch] = React.useState<string>("");
  const [showAddStoreOutletModal, setShowAddStoreOutletModal] = React.useState<boolean>(false);
  const [newStoreOutletId, setNewStoreOutletId] = React.useState<string>("");
  const [newStoreOutletName, setNewStoreOutletName] = React.useState<string>("");
  const [newStoreOutletAddress, setNewStoreOutletAddress] = React.useState<string>("");
  const [newStoreOutletBrand, setNewStoreOutletBrand] = React.useState<string>("");
  const [savingStoreOutlet, setSavingStoreOutlet] = React.useState<boolean>(false);
  const [showStoreDirectoryModal, setShowStoreDirectoryModal] = React.useState<boolean>(false);
  const [assignStoreClaim, setAssignStoreClaim] = React.useState<CashbackClaimRecord | null>(null);

  // Multi-selection & Bulk Processing States
  const [selectedClaimIds, setSelectedClaimIds] = React.useState<string[]>([]);
  const [runningCheckId, setRunningCheckId] = React.useState<string | null>(null);
  const [bulkChecking, setBulkChecking] = React.useState<boolean>(false);
  const [bulkApproving, setBulkApproving] = React.useState<boolean>(false);

  // Dedicated Action Modals
  const [reviewClaim, setReviewClaim] = React.useState<CashbackClaimRecord | null>(null);
  const [reviewEditPurchase, setReviewEditPurchase] = React.useState<number | string>("");
  const [reviewEditQty, setReviewEditQty] = React.useState<number | string>(1);
  const [reviewRejectReason, setReviewRejectReason] = React.useState<string>("");
  const [savingReview, setSavingReview] = React.useState<boolean>(false);
  const [readAnswerClaim, setReadAnswerClaim] = React.useState<CashbackClaimRecord | null>(null);
  const [ocrDataClaim, setOcrDataClaim] = React.useState<CashbackClaimRecord | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = React.useState<string | null>(null);

  // Edit Amount Spend & Quantity States
  const [editSpendClaim, setEditSpendClaim] = React.useState<CashbackClaimRecord | null>(null);
  const [editSpendAmount, setEditSpendAmount] = React.useState<number | string>("");
  const [editSpendQty, setEditSpendQty] = React.useState<number | string>(1);
  const [editSpendRemark, setEditSpendRemark] = React.useState<string>("");
  const [savingSpend, setSavingSpend] = React.useState<boolean>(false);

  // Activity & Audit Log Modal State
  const [logClaim, setLogClaim] = React.useState<CashbackClaimRecord | null>(null);
  const [storeSearch, setStoreSearch] = React.useState<string>("");
  const [selectedExistingStoreId, setSelectedExistingStoreId] = React.useState<string>("");
  const [newStoreEntity, setNewStoreEntity] = React.useState<string>("");
  const [newOutletId, setNewOutletId] = React.useState<string>("");
  const [newDisplayName, setNewDisplayName] = React.useState<string>("");
  const [newStoreAddress, setNewStoreAddress] = React.useState<string>("");
  const [autoLinkMatchingClaims, setAutoLinkMatchingClaims] = React.useState<boolean>(true);
  const [savingStore, setSavingStore] = React.useState<boolean>(false);
  const [claims, setClaims] = React.useState<CashbackClaimRecord[]>([]);
  const [taskLibrary, setTaskLibrary] = React.useState<CashbackTaskItem[]>([]);
  const [movementReport, setMovementReport] = React.useState<StoreMovementItem[]>([]);
  const [contests, setContests] = React.useState<HsgContestRecord[]>([]);
  const [contestSubmissions, setContestSubmissions] = React.useState<HsgContestSubmission[]>([]);
  const [withdrawals, setWithdrawals] = React.useState<HsgWithdrawalRecord[]>([]);
  const [users, setUsers] = React.useState<HsgUserRecord[]>([]);
  const [transactions, setTransactions] = React.useState<HsgTransactionRecord[]>([]);
  const [announcements, setAnnouncements] = React.useState<HsgAnnouncementRecord[]>([]);
  const [highlights, setHighlights] = React.useState<HsgHighlightRecord[]>([]);
  const [events, setEvents] = React.useState<HsgEventRecord[]>([]);
  const [eventRsvps, setEventRsvps] = React.useState<HsgEventRsvpRecord[]>([]);
  const [hsgSettings, setHsgSettings] = React.useState<Record<string, any>>({});
  const [merchCatalog, setMerchCatalog] = React.useState<HsgMerchRecord[]>([]);
  const [merchOrders, setMerchOrders] = React.useState<any[]>([]);
  const [contestCreateTrigger, setContestCreateTrigger] = React.useState<number>(0);
  const [merchCreateTrigger, setMerchCreateTrigger] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  // Filters
  const [leftTab, setLeftTab] = React.useState<"active" | "archive">("active");
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>("ALL");
  const [claimCampaignFilter, setClaimCampaignFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [campaignSearch, setCampaignSearch] = React.useState<string>("");

  // Date range filter for claims (default: past 3 weeks)
  const [claimStartDate, setClaimStartDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 21);
    return d.toISOString().split("T")[0];
  });
  const [claimEndDate, setClaimEndDate] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Delete campaign confirmation modal
  const [campaignToDelete, setCampaignToDelete] = React.useState<CashbackCampaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = React.useState<boolean>(false);

  // Inspect claim modal
  const [inspectClaim, setInspectClaim] = React.useState<CashbackClaimRecord | null>(null);
  const [revokeReason, setRevokeReason] = React.useState<string>(
    "Receipt did not meet minimum purchase requirement."
  );
  const [revoking, setRevoking] = React.useState<boolean>(false);
  const [approving, setApproving] = React.useState<boolean>(false);
  const [claimStatusFilter, setClaimStatusFilter] = React.useState<"ALL" | "pending" | "credited" | "rejected">("ALL");

  // Master products catalog from products_db
  const [productsCatalog, setProductsCatalog] = React.useState<any[]>([]);
  const [selectedCatalogSku, setSelectedCatalogSku] = React.useState<string>("");

  // Create / Edit modal state
  const [showModal, setShowModal] = React.useState<boolean>(false);
  const [editingCampaignId, setEditingCampaignId] = React.useState<string | null>(null);
  const [savingCampaign, setSavingCampaign] = React.useState<boolean>(false);

  // Form states (Empty by default when creating new campaign)
  const [campName, setCampName] = React.useState<string>("");
  const [campDisplayOrder, setCampDisplayOrder] = React.useState<number>(1);
  const [campTitle, setCampTitle] = React.useState<string>("");
  const [campBrand, setCampBrand] = React.useState<string>("");
  const [campDescription, setCampDescription] = React.useState<string>("");
  const [campInstructions, setCampInstructions] = React.useState<string>("");
  const [campRules, setCampRules] = React.useState<string>("");
  const [campPosterUrl, setCampPosterUrl] = React.useState<string>("");
  const [campStartTime, setCampStartTime] = React.useState<string>("");
  const [campEndTime, setCampEndTime] = React.useState<string>("");
  const [campRewardType, setCampRewardType] = React.useState<"cashback" | "points" | "both">("cashback");
  const [campRewardCash, setCampRewardCash] = React.useState<number>(1.0);
  const [campRewardPoints, setCampRewardPoints] = React.useState<number>(50);
  const [campUnlockRewards, setCampUnlockRewards] = React.useState<{ tier: number; stores: number; reward: string; cash?: number; points?: number }[]>([]);
  const [campVelocityTaskEnabled, setCampVelocityTaskEnabled] = React.useState<boolean>(true);
  const [campCustomQuestions, setCampCustomQuestions] = React.useState<{ id: string; question: string }[]>([]);
  const [campDisplayTitle, setCampDisplayTitle] = React.useState<string>("");
  const [campDisplayDesc, setCampDisplayDesc] = React.useState<string>("");
  const [campCtaText, setCampCtaText] = React.useState<string>("Submit & Claim Cashback");
  const [campBannerImg, setCampBannerImg] = React.useState<string>("");
  const [campStartDate, setCampStartDate] = React.useState<string>("");
  const [campEndDate, setCampEndDate] = React.useState<string>("");
  const [campBrandName, setCampBrandName] = React.useState<string>("");
  const [campProductId, setCampProductId] = React.useState<string>("");
  const [campItemName, setCampItemName] = React.useState<string>("");
  const [campProductPhoto, setCampProductPhoto] = React.useState<string>("");
  const [campUnitLabel, setCampUnitLabel] = React.useState<string>("Bottles");
  const [campRewardMode, setCampRewardMode] = React.useState<CashbackPurchaseMode>("flat");
  const [campCashbackAmount, setCampCashbackAmount] = React.useState<number>(0);
  const [campMinQty, setCampMinQty] = React.useState<number>(1);
  const [campWhereToBuy, setCampWhereToBuy] = React.useState<string>("");
  const [enableExtraMilestone, setEnableExtraMilestone] = React.useState<boolean>(false);
  const [milestoneTargets, setMilestoneTargets] = React.useState<StoreVisitMilestone[]>([]);
  const [enableMovementTask, setEnableMovementTask] = React.useState<boolean>(true);
  const [coreTaskTitle, setCoreTaskTitle] = React.useState<string>("Task #1 — Store Velocity Check");
  const [coreTaskQuestion, setCoreTaskQuestion] = React.useState<string>(
    "Ask the cashier: On average, how many units of this product are selling today?"
  );
  const [coreTaskNote, setCoreTaskNote] = React.useState<string>(
    "* Note: Select 10+ if more than 10 units are selling today."
  );
  const [campaignTasks, setCampaignTasks] = React.useState<CashbackTaskItem[]>([]);
  const [selectedLibraryTaskId, setSelectedLibraryTaskId] = React.useState<string>("");

  // Task Library Modal states
  const [showTaskModal, setShowTaskModal] = React.useState<boolean>(false);
  const [editingTask, setEditingTask] = React.useState<CashbackTaskItem | null>(null);
  const [taskFormTitle, setTaskFormTitle] = React.useState<string>("");
  const [taskFormQuestion, setTaskFormQuestion] = React.useState<string>("");
  const [taskFormType, setTaskFormType] = React.useState<CashbackTaskType>("radio_select");
  const [taskFormOptions, setTaskFormOptions] = React.useState<string>("");
  const [taskFormMinRange, setTaskFormMinRange] = React.useState<number>(1);
  const [taskFormMaxRange, setTaskFormMaxRange] = React.useState<number>(10);
  const [taskFormNote, setTaskFormNote] = React.useState<string>("");
  const [savingTask, setSavingTask] = React.useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = React.useState<CashbackTaskItem | null>(null);
  const [deletingTask, setDeletingTask] = React.useState<boolean>(false);

  // Image upload states
  const [uploadingBanner, setUploadingBanner] = React.useState<boolean>(false);
  const [uploadingProduct, setUploadingProduct] = React.useState<boolean>(false);
  const [uploadingPoster, setUploadingPoster] = React.useState<boolean>(false);

  // Dedicated upload to Cloudflare storage
  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "banner" | "product" | "poster"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "banner") setUploadingBanner(true);
    else if (type === "poster") setUploadingPoster(true);
    else setUploadingProduct(true);

    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `hsg_cashback/${Date.now()}_${cleanName}`;
      const res = await fetch(
        `${WORKER_URL}/api/upload?filename=${encodeURIComponent(fileName)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        }
      );

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (!data.url) throw new Error("No URL returned from storage");

      if (type === "poster") {
        setCampPosterUrl(data.url);
        showToast("Campaign poster uploaded successfully", "success");
      } else if (type === "banner") {
        setCampBannerImg(data.url);
        showToast("Banner image uploaded successfully", "success");
      } else {
        setCampProductPhoto(data.url);
        showToast("Product photo uploaded successfully", "success");
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      showToast(err.message || "Failed to upload image", "error");
    } finally {
      if (type === "banner") setUploadingBanner(false);
      else if (type === "poster") setUploadingPoster(false);
      else setUploadingProduct(false);
    }
  };

  // Fetch live data
  const loadLiveData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch campaigns
      const cRes = await fetch(`${WORKER_URL}/api/hsg-app/cashback/campaigns`);
      if (cRes.ok) {
        const cJson = await cRes.json();
        if (cJson.campaigns) {
          setCampaigns(cJson.campaigns);
        }
      }

      // Fetch Registered Stores Directory
      const storeFetchRes = await fetch(`${WORKER_URL}/api/hsg-app/stores`);
      if (storeFetchRes.ok) {
        const storeJson = await storeFetchRes.json();
        if (storeJson.stores) setStores(storeJson.stores);
      }

      // Fetch Store Outlets Directory (for OCR matching & outlet registry)
      try {
        const soRes = await fetch(`${WORKER_URL}/api/hsg-app/cashback/store-outlets`);
        if (soRes.ok) {
          const soJson = await soRes.json();
          if (soJson.outlets) setStoreOutlets(soJson.outlets);
        }
      } catch (e) {
        console.warn("Store outlets fetch error:", e);
      }

      // 2. Fetch claims
      const clRes = await fetch(`${WORKER_URL}/api/hsg-app/cashback/claims?time_filter=all`);
      if (clRes.ok) {
        const clJson = await clRes.json();
        if (clJson.claims) {
          setClaims(clJson.claims);
        }
      }

      // 3. Fetch task library
      const tkRes = await fetch(`${WORKER_URL}/api/hsg-app/cashback/tasks`);
      if (tkRes.ok) {
        const tkJson = await tkRes.json();
        if (tkJson.tasks) {
          setTaskLibrary(tkJson.tasks);
        }
      }

      // 4. Fetch store movement report
      const rpRes = await fetch(`${WORKER_URL}/api/hsg-app/cashback/report/movement`);
      if (rpRes.ok) {
        const rpJson = await rpRes.json();
        if (rpJson.report) {
          setMovementReport(rpJson.report);
        }
      }

      // 5. Fetch Contests & Submissions
      const ctRes = await fetch(`${WORKER_URL}/api/hsg-app/contests`);
      if (ctRes.ok) {
        const ctJson = await ctRes.json();
        if (ctJson.contests) setContests(ctJson.contests);
        if (ctJson.submissions) setContestSubmissions(ctJson.submissions);
      }

      // 6. Fetch Withdrawals
      const wdRes = await fetch(`${WORKER_URL}/api/hsg-app/cashback/withdrawals`);
      if (wdRes.ok) {
        const wdJson = await wdRes.json();
        if (wdJson.withdrawals) setWithdrawals(wdJson.withdrawals);
      }

      // 7. Fetch Users
      const usRes = await fetch(`${WORKER_URL}/api/hsg-app/users`);
      if (usRes.ok) {
        const usJson = await usRes.json();
        if (usJson.users) setUsers(usJson.users);
      }

      // 8. Fetch News (Announcements & Highlights)
      const nwRes = await fetch(`${WORKER_URL}/api/hsg-app/news?admin=true`);
      if (nwRes.ok) {
        const nwJson = await nwRes.json();
        if (nwJson.announcements) setAnnouncements(nwJson.announcements);
        if (nwJson.highlights) setHighlights(nwJson.highlights);
      }

      // 9. Fetch Events & RSVPs
      const evRes = await fetch(`${WORKER_URL}/api/hsg-app/events`);
      if (evRes.ok) {
        const evJson = await evRes.json();
        if (evJson.events) setEvents(evJson.events);
        if (evJson.rsvps) setEventRsvps(evJson.rsvps);
      }

      // 10. Fetch Settings & Merch & Shop Orders
      const stRes = await fetch(`${WORKER_URL}/api/hsg-app/settings`);
      if (stRes.ok) {
        const stJson = await stRes.json();
        if (stJson.settings) setHsgSettings(stJson.settings);
        if (stJson.merch) setMerchCatalog(stJson.merch);
        if (stJson.merch_orders) setMerchOrders(stJson.merch_orders);
      }

      // 11. Fetch Products Master Catalog
      try {
        const prodRes = await fetch(`${WORKER_URL}/api/products`);
        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          const items = Array.isArray(prodJson)
            ? prodJson
            : Array.isArray(prodJson.data)
            ? prodJson.data
            : [];
          setProductsCatalog(items);
        }
      } catch {}

      // 12. Fetch Live Transactions Ledger (Unified Database Traceability)
      try {
        const txRes = await fetch(`${WORKER_URL}/api/hsg-app/transactions?limit=250`);
        if (txRes.ok) {
          const txJson = await txRes.json();
          if (txJson.transactions) setTransactions(txJson.transactions);
        }
      } catch (txErr) {
        console.warn("Failed to fetch transactions:", txErr);
      }

      if (silent && typeof BroadcastChannel !== "undefined") {
        try {
          const bc = new BroadcastChannel("hsg_app_live_sync");
          bc.postMessage({ type: "hsg_admin_updated", ts: Date.now() });
          bc.close();
        } catch {}
      }
    } catch (e: any) {
      console.error("Failed to load live cashback data:", e);
      showToast("Error connecting to live cashback database", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadLiveData();
    const handleDbRefresh = () => {
      loadLiveData(true);
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadLiveData]);

  const handleNavigateFromOverview = (tabId: string, subTabId?: string) => {
    setActiveTab(tabId);
    if (tabId === "Cashback" && subTabId) {
      setCashbackSubTab(subTabId as any);
    } else if (tabId === "Shop" && subTabId) {
      setShopSubTab(subTabId as any);
    } else if (tabId === "Community" && subTabId) {
      setCommunitySubTab(subTabId as any);
    } else if (tabId === "Members" && subTabId) {
      setMembersSubTab(subTabId as any);
    }
  };

  // Store Assignment & Management Handlers
  const handleQuickAssignStore = async (claimId: string, store: HsgStoreRecord) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(claimId)}/assign-store`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: store.outlet_id,
          outlet_name: store.display_name,
          raw_address: store.store_address || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign store");
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? { ...c, matched_outlet_id: store.outlet_id, matched_outlet_name: store.display_name }
            : c
        )
      );
      showToast(`Claim assigned to ${store.display_name} (${store.outlet_id})`, "success");
    } catch {
      showToast("Failed to assign store", "error");
    }
  };

  const handleCreateNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreEntity.trim() || !newOutletId.trim()) {
      showToast("Store Entity and Outlet ID are required", "error");
      return;
    }
    setSavingStore(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_entity: newStoreEntity.trim(),
          outlet_id: newOutletId.trim(),
          display_name: newDisplayName.trim() || `${newStoreEntity.trim()} ${newOutletId.trim()}`,
          store_address: newStoreAddress.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save store");
      const data = await res.json();
      if (data.store) {
        setStores((prev) => [...prev.filter((s) => s.id !== data.store.id), data.store]);
      }
      showToast("Store outlet registered in Supabase!", "success");
      setNewStoreEntity("");
      setNewOutletId("");
      setNewDisplayName("");
      setNewStoreAddress("");
      loadLiveData(true);
    } catch {
      showToast("Failed to register store", "error");
    } finally {
      setSavingStore(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    try {
      await fetch(`${WORKER_URL}/api/hsg-app/stores/${encodeURIComponent(id)}`, { method: "DELETE" });
      setStores((prev) => prev.filter((s) => s.id !== id));
      showToast("Store outlet removed", "success");
    } catch {
      showToast("Failed to delete store", "error");
    }
  };

  const handleOpenEditSpend = (clm: CashbackClaimRecord) => {
    setEditSpendClaim(clm);
    setEditSpendAmount(clm.receipt_amount || 0);
    setEditSpendQty(clm.qty || 1);
    setEditSpendRemark("");
  };

  const handleSaveSpend = async () => {
    if (!editSpendClaim) return;
    const amt = Number(editSpendAmount);
    const q = Number(editSpendQty);
    if (isNaN(amt) || amt < 0) {
      showToast("Please enter a valid spend amount", "error");
      return;
    }
    if (isNaN(q) || q < 1) {
      showToast("Please enter a valid quantity (min 1)", "error");
      return;
    }
    setSavingSpend(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(editSpendClaim.id)}/edit-spend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receipt_amount: amt,
            qty: q,
            admin_name: "Admin",
            remark: editSpendRemark.trim(),
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update claim spend");
      const json = await res.json();
      const updated = json.claim;
      setClaims((prev) =>
        prev.map((c) =>
          c.id === editSpendClaim.id
            ? {
                ...c,
                receipt_amount: amt,
                qty: q,
                edited_by_admin: true,
                logs: updated?.logs || [
                  ...(c.logs || c.verify?.logs || []),
                  {
                    action: "edit_spend_qty",
                    by: "Admin",
                    timestamp: Date.now(),
                    prev_amount: c.receipt_amount,
                    new_amount: amt,
                    prev_qty: c.qty,
                    new_qty: q,
                    remark: editSpendRemark.trim() || `Spend updated to ${amt.toFixed(2)}, qty to ${q}`,
                  },
                ],
                raw_ocr_data: {
                  ...c.raw_ocr_data,
                  receipt_amount: amt,
                  qty: q,
                  edited_by_admin: true,
                },
              }
            : c
        )
      );
      if (inspectClaim && inspectClaim.id === editSpendClaim.id) {
        setInspectClaim((prev) =>
          prev
            ? {
                ...prev,
                receipt_amount: amt,
                qty: q,
                edited_by_admin: true,
                raw_ocr_data: {
                  ...prev.raw_ocr_data,
                  receipt_amount: amt,
                  qty: q,
                  edited_by_admin: true,
                },
              }
            : null
        );
      }
      showToast("Claim spend & quantity updated and logged", "success");
      setEditSpendClaim(null);
    } catch {
      showToast("Failed to update claim spend", "error");
    } finally {
      setSavingSpend(false);
    }
  };

  const handleAssignModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStoreClaim) return;
    setSavingStore(true);

    try {
      let chosenStore: HsgStoreRecord | undefined;

      if (selectedExistingStoreId) {
        chosenStore = stores.find((s) => s.id === selectedExistingStoreId);
      } else if (newStoreEntity.trim() && newOutletId.trim()) {
        const storeRes = await fetch(`${WORKER_URL}/api/hsg-app/stores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_entity: newStoreEntity.trim(),
            outlet_id: newOutletId.trim(),
            display_name: newDisplayName.trim() || `${newStoreEntity.trim()} ${newOutletId.trim()}`,
            store_address: newStoreAddress.trim() || assignStoreClaim.raw_address,
          }),
        });
        if (storeRes.ok) {
          const sJson = await storeRes.json();
          chosenStore = sJson.store;
        }
      }

      if (!chosenStore) {
        showToast("Please select an existing outlet or enter new outlet details", "error");
        setSavingStore(false);
        return;
      }

      await fetch(`${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(assignStoreClaim.id)}/assign-store`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: chosenStore.outlet_id,
          outlet_name: chosenStore.display_name,
          raw_address: chosenStore.store_address,
        }),
      });

      if (autoLinkMatchingClaims && assignStoreClaim.raw_address) {
        const othersToLink = claims.filter(
          (c) =>
            c.id !== assignStoreClaim.id &&
            !c.matched_outlet_id &&
            c.raw_address &&
            calculateAddressSimilarity(c.raw_address, assignStoreClaim.raw_address) >= 0.70
        );

        for (const oc of othersToLink) {
          await fetch(`${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(oc.id)}/assign-store`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outlet_id: chosenStore.outlet_id,
              outlet_name: chosenStore.display_name,
              raw_address: chosenStore.store_address,
            }),
          });
        }
        if (othersToLink.length > 0) {
          showToast(`Also auto-mapped ${othersToLink.length} other claim(s) matching this address!`, "success");
        }
      }

      showToast(`Claim assigned to ${chosenStore.display_name}`, "success");
      setAssignStoreClaim(null);
      setSelectedExistingStoreId("");
      setNewStoreEntity("");
      setNewOutletId("");
      setNewDisplayName("");
      setNewStoreAddress("");
      loadLiveData(true);
    } catch {
      showToast("Failed to assign store", "error");
    } finally {
      setSavingStore(false);
    }
  };

  // Select product from Master Catalog
  const handleSelectCatalogProduct = (sku: string) => {
    setSelectedCatalogSku(sku);
    if (!sku || sku === "custom") {
      setCampProductId("");
      return;
    }
    const found = productsCatalog.find(
      (p) => (p.sku || p.id || "").toLowerCase() === sku.toLowerCase()
    );
    if (found) {
      setCampProductId(found.sku || found.id || "");
      setCampItemName(found.display_name || found.name || "");
      setCampBrandName(found.brand_name || found.brands_id || "HSG+");
      if (found.image) setCampProductPhoto(found.image);
      setCampUnitLabel(found.unit || "Bottles");
    }
  };

  // Open modal for Create or Edit
  const handleOpenModal = (prefill?: CashbackCampaign) => {
    if (prefill) {
      setEditingCampaignId(prefill.id);
      setCampDisplayOrder(prefill.display_order || 1);
      setCampTitle(prefill.title || prefill.campaign_name || "");
      setCampName(prefill.title || prefill.campaign_name || "");
      setCampBrand(prefill.brand || prefill.brand_name || "");
      setCampBrandName(prefill.brand || prefill.brand_name || "");
      setCampDescription(prefill.description || prefill.display_description || "");
      setCampDisplayDesc(prefill.description || prefill.display_description || "");
      setCampInstructions(prefill.instructions || "");
      setCampRules(prefill.rules || "");
      const poster = prefill.poster_url || prefill.promo_card_url || prefill.banner_image_url || prefill.product_image_url || "";
      setCampPosterUrl(poster);
      setCampBannerImg(poster);
      setCampProductPhoto(prefill.product_image_url || poster);
      setCampItemName(prefill.product_name || prefill.title || prefill.campaign_name || "");
      setCampProductId(prefill.product_id || "");
      setCampStartTime(formatForDateTimeLocal(prefill.start_time || prefill.start_timestamp));
      setCampEndTime(formatForDateTimeLocal(prefill.end_time || prefill.end_timestamp));
      const rType = (prefill.reward_type as any) || (prefill.purchase_reward_mode === "points" ? "points" : "cashback");
      setCampRewardType(rType);
      setCampRewardMode(rType === "points" ? "points" : "flat");
      setCampRewardCash(prefill.reward_cash !== undefined ? prefill.reward_cash : (prefill.cashback_amount || 1.0));
      setCampCashbackAmount(prefill.reward_cash !== undefined ? prefill.reward_cash : (prefill.cashback_amount || 1.0));
      setCampRewardPoints(prefill.reward_points !== undefined ? prefill.reward_points : 50);
      setCampUnlockRewards(
        (prefill.unlock_rewards || []).map((t: any, i: number) => ({
          tier: t.tier || i + 1,
          stores: Number(t.stores || (i + 1) * 2),
          cash: t.cash !== undefined ? Number(t.cash) : (parseFloat(String(t.reward || "").replace(/[^0-9.]/g, "")) || 0),
          points: t.points !== undefined ? Number(t.points) : 0,
          reward: t.reward || `$${t.cash || 0}.00`,
        }))
      );
      setCampVelocityTaskEnabled(prefill.velocity_task_enabled !== false);
      setCampCustomQuestions(prefill.custom_questions || []);
    } else {
      setEditingCampaignId(null);
      setCampDisplayOrder(1);
      setCampTitle("");
      setCampName("");
      setCampBrand("");
      setCampBrandName("");
      setCampDescription("");
      setCampDisplayDesc("");
      setCampInstructions("");
      setCampRules("");
      setCampPosterUrl("");
      setCampBannerImg("");
      setCampProductPhoto("");
      setCampItemName("");
      setCampProductId("");
      setCampStartTime(formatForDateTimeLocal(Date.now()));
      setCampEndTime(formatForDateTimeLocal(Date.now() + 30 * 86400000));
      setCampRewardType("cashback");
      setCampRewardMode("flat");
      setCampRewardCash(1.0);
      setCampCashbackAmount(1.0);
      setCampRewardPoints(50);
      setCampUnlockRewards([]);
      setCampVelocityTaskEnabled(true);
      setCampCustomQuestions([]);
    }
    setShowModal(true);
  };

  // Save campaign to live backend
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeCount = campaigns.filter(c => c.is_active && !c.is_archived && c.id !== editingCampaignId).length;
    if (activeCount >= 4 && !campaigns.find(c => c.id === editingCampaignId)?.is_active) {
      showToast("Limit reached: Maximum 4 campaigns can be active at once. Please set one to Inactive first.", "error");
      return;
    }
    const finalTitle = campTitle.trim() || campName.trim();
    if (!finalTitle) {
      showToast("Please provide Campaign Title", "error");
      return;
    }

    setSavingCampaign(true);
    try {
      const payload: Partial<CashbackCampaign> = {
        id: editingCampaignId || undefined,
        title: finalTitle,
        campaign_name: finalTitle,
        brand: campBrand.trim() || "",
        brand_name: campBrand.trim() || "",
        brand_id: campBrand.trim() ? `BRAND-${campBrand.trim().toUpperCase()}` : "",
        product_id: campProductId.trim() || (editingCampaignId ? undefined : `PROD-${Date.now().toString().slice(-4)}`),
        product_name: campItemName.trim() || finalTitle,
        product_image_url: campPosterUrl || campProductPhoto,
        promo_card_url: campPosterUrl || campBannerImg,
        banner_image_url: campPosterUrl || campBannerImg,
        poster_url: campPosterUrl,
        description: campDescription.trim(),
        display_description: campDescription.trim(),
        instructions: campInstructions.trim(),
        rules: campRules.trim(),
        start_time: campStartTime,
        end_time: campEndTime,
        start_timestamp: campStartTime ? new Date(campStartTime).getTime() : Date.now(),
        end_timestamp: campEndTime ? new Date(campEndTime).getTime() : Date.now() + 86400000 * 30,
        reward_type: campRewardType,
        reward_cash: campRewardType === "points" ? 0 : Number(campRewardCash || 0),
        reward_points: campRewardType === "cashback" ? 0 : Number(campRewardPoints || 0),
        cashback_amount: campRewardType === "points" ? 0 : Number(campRewardCash || 0),
        purchase_reward_mode: campRewardType === "points" ? "points" : "flat",
        unlock_rewards: campUnlockRewards,
        velocity_task_enabled: campVelocityTaskEnabled,
        custom_questions: campCustomQuestions,
        display_order: campDisplayOrder,
        is_active: true,
        is_archived: false,
      };

      const res = await fetch(`${WORKER_URL}/api/hsg-app/cashback/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save campaign");
      }

      showToast("Cashback Campaign saved & live in database!", "success");
      setShowModal(false);
      loadLiveData(true);
    } catch (err: any) {
      console.error("Save campaign failed:", err);
      showToast(err.message || "Failed to save campaign", "error");
    } finally {
      setSavingCampaign(false);
    }
  };

  // Run Check single row handler
  const handleRunCheckSingle = async (clm: CashbackClaimRecord) => {
    setRunningCheckId(clm.id);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(clm.id)}/run-check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Run check failed");
      showToast(`Check finished: ${data.diagnose_status}`, "success");
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Run check failed", "error");
    } finally {
      setRunningCheckId(null);
    }
  };

  // Bulk Run Check handler
  const handleBulkRunCheck = async () => {
    if (selectedClaimIds.length === 0) {
      showToast("Please select at least one row", "warning");
      return;
    }
    setBulkChecking(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/cashback/claims/bulk-run-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_ids: selectedClaimIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk run check failed");
      showToast(`Processed ${data.processed || selectedClaimIds.length} receipts successfully!`, "success");
      setSelectedClaimIds([]);
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Bulk check failed", "error");
    } finally {
      setBulkChecking(false);
    }
  };

  // Bulk Approve handler (Strictly enforces diagnose_status === 'valid')
  const handleBulkApprove = async () => {
    if (selectedClaimIds.length === 0) {
      showToast("Please select at least one row", "warning");
      return;
    }
    const selectedClaims = claims.filter((c) => selectedClaimIds.includes(c.id));
    const validClaims = selectedClaims.filter((c) => (c.diagnose_status || "").trim() === "valid");
    const nonValidCount = selectedClaims.length - validClaims.length;

    if (validClaims.length === 0) {
      showToast("None of the selected rows have '{valid}' diagnose status. Run Check or resolve issues first.", "error");
      return;
    }

    if (nonValidCount > 0) {
      showToast(`Excluding ${nonValidCount} rows without '{valid}' status from approval.`, "warning");
    }

    setBulkApproving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/cashback/claims/bulk-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_ids: validClaims.map((c) => c.id),
          verified_by: profile?.name || "Admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk approval failed");
      showToast(`Successfully approved ${data.approved || validClaims.length} valid claims!`, "success");
      setSelectedClaimIds([]);
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Bulk approval failed", "error");
    } finally {
      setBulkApproving(false);
    }
  };

  // Open Review Window handler
  const handleOpenReviewModal = (clm: CashbackClaimRecord) => {
    setReviewClaim(clm);
    setReviewEditPurchase(
      clm.total_purchase !== undefined && clm.total_purchase !== null
        ? clm.total_purchase
        : (clm.receipt_amount || 0)
    );
    setReviewEditQty(
      clm.total_qty !== undefined && clm.total_qty !== null
        ? clm.total_qty
        : (clm.qty || 1)
    );
    setReviewRejectReason("");
  };

  // Save Purchase & Qty edits inside Review Window
  const handleSaveReviewAmounts = async () => {
    if (!reviewClaim) return;
    setSavingReview(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(reviewClaim.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            total_purchase: Number(reviewEditPurchase || 0),
            total_qty: Number(reviewEditQty || 1),
            verified_by: profile?.name || "Admin",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update review amounts");
      showToast("Updated purchase amount and quantity!", "success");
      setReviewClaim((prev) =>
        prev
          ? {
              ...prev,
              total_purchase: Number(reviewEditPurchase || 0),
              receipt_amount: Number(reviewEditPurchase || 0),
              total_qty: Number(reviewEditQty || 1),
              qty: Number(reviewEditQty || 1),
            }
          : null
      );
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Update failed", "error");
    } finally {
      setSavingReview(false);
    }
  };

  // Approve from inside Review Window
  const handleApproveFromReview = async () => {
    if (!reviewClaim) return;
    setSavingReview(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(reviewClaim.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            total_purchase: Number(reviewEditPurchase || 0),
            total_qty: Number(reviewEditQty || 1),
            verified_by: profile?.name || "Admin",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      showToast("Claim approved and reward credited to member!", "success");
      setReviewClaim(null);
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Approval failed", "error");
    } finally {
      setSavingReview(false);
    }
  };

  // Reject from inside Review Window
  const handleRejectFromReview = async () => {
    if (!reviewClaim) return;
    setSavingReview(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(reviewClaim.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            reason: reviewRejectReason.trim() || "Receipt does not match criteria",
            total_purchase: Number(reviewEditPurchase || 0),
            total_qty: Number(reviewEditQty || 1),
            verified_by: profile?.name || "Admin",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");
      showToast("Claim rejected.", "success");
      setReviewClaim(null);
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Rejection failed", "error");
    } finally {
      setSavingReview(false);
    }
  };

  // Store Outlet CRUD Handlers
  const handleSaveStoreOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreOutletId.trim() || !newStoreOutletName.trim() || !newStoreOutletAddress.trim()) {
      showToast("Please provide Outlet ID, Store Name, and Store Address", "error");
      return;
    }
    setSavingStoreOutlet(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/cashback/store-outlets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newStoreOutletId.trim(),
          store_name: newStoreOutletName.trim(),
          store_address: newStoreOutletAddress.trim(),
          brand: newStoreOutletBrand.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save outlet");
      showToast("Store outlet registered successfully!", "success");
      setShowAddStoreOutletModal(false);
      setNewStoreOutletId("");
      setNewStoreOutletName("");
      setNewStoreOutletAddress("");
      setNewStoreOutletBrand("");
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Failed to save outlet", "error");
    } finally {
      setSavingStoreOutlet(false);
    }
  };

  const handleDeleteStoreOutlet = async (id: string) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/cashback/store-outlets/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete outlet");
      showToast("Store outlet removed", "success");
      setStoreOutlets((prev) => prev.filter((o) => o.id !== id));
    } catch (e: any) {
      showToast(e.message || "Delete failed", "error");
    }
  };

  // Toggle Publish / Unpublish
  const handleTogglePublish = async (camp: CashbackCampaign, makeActive: boolean) => {
    if (makeActive) {
      const activeCount = campaigns.filter(c => c.is_active && !c.is_archived && c.id !== camp.id).length;
      if (activeCount >= 4) {
        showToast("Limit reached: Maximum 4 campaigns can be active at once. Please set one to Inactive first.", "error");
        return;
      }
    }
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/campaigns/${encodeURIComponent(camp.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: makeActive, is_archived: false }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status");
      showToast(makeActive ? "Campaign published & live on HSG+ App" : "Campaign unpublished", "success");
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Action failed", "error");
    }
  };

  // Archive campaign (Only enabled when unpublished)
  const handleArchiveCampaign = async (camp: CashbackCampaign) => {
    if (camp.is_active) {
      showToast("Please unpublish the campaign before archiving", "error");
      return;
    }
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/campaigns/${encodeURIComponent(camp.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_archived: true, is_active: false }),
        }
      );
      if (!res.ok) throw new Error("Failed to archive campaign");
      showToast("Campaign moved to Archive", "success");
      if (selectedCampaignId === camp.id) setSelectedCampaignId("ALL");
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Action failed", "error");
    }
  };

  // Revoke archive
  const handleRevokeArchive = async (camp: CashbackCampaign) => {
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/campaigns/${encodeURIComponent(camp.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_archived: false, is_active: false }),
        }
      );
      if (!res.ok) throw new Error("Failed to restore campaign");
      showToast("Campaign restored to Active Drops", "success");
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Action failed", "error");
    }
  };

  // Delete campaign permanently (only allowed if no claims linked)
  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    const linkedClaimsCount = claims.filter((c) => c.campaign_id === campaignToDelete.id).length;
    if (linkedClaimsCount > 0) {
      showToast(
        `Cannot delete campaign: already linked to ${linkedClaimsCount} customer claim(s)`,
        "error"
      );
      setCampaignToDelete(null);
      return;
    }

    setDeletingCampaign(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/campaigns/${encodeURIComponent(campaignToDelete.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to delete campaign");
      }
      showToast("Campaign deleted successfully", "success");
      if (selectedCampaignId === campaignToDelete.id) setSelectedCampaignId("ALL");
      setCampaignToDelete(null);
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Failed to delete campaign", "error");
    } finally {
      setDeletingCampaign(false);
    }
  };

  // Approve claim
  const handleApproveClaim = async () => {
    if (!inspectClaim) return;
    setApproving(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(inspectClaim.id)}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified_by: "Admin" }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Approval failed");
      }
      showToast(`Approved claim ${inspectClaim.transaction_id}! Cashback credited to member.`, "success");
      setInspectClaim(null);
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Failed to approve claim", "error");
    } finally {
      setApproving(false);
    }
  };

  // Revoke / Reject claim
  const handleRevokeClaim = async (overrideReason?: string) => {
    if (!inspectClaim) return;
    setRevoking(true);
    try {
      const finalReason = overrideReason || revokeReason;
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/claims/${encodeURIComponent(inspectClaim.id)}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: finalReason, verified_by: "Admin" }),
        }
      );

      if (!res.ok) throw new Error("Action failed");
      showToast(`Rejected claim ${inspectClaim.transaction_id}`, "success");
      setInspectClaim(null);
      loadLiveData(true);
    } catch (e: any) {
      showToast(e.message || "Failed to reject claim", "error");
    } finally {
      setRevoking(false);
    }
  };

  // Manage dynamic tasks in form (max 2 additional tasks besides Core Task #1)
  const handleAddTask = () => {
    if (campaignTasks.length >= 2) {
      showToast("Maximum 2 additional tasks allowed besides Core Task #1", "error");
      return;
    }
    const idx = campaignTasks.length + 2;
    setCampaignTasks((prev) => [
      ...prev,
      {
        id: `task_${Date.now()}`,
        title: `Task #${idx}`,
        question: "Where is this product placed in the store?",
        type: "radio_select",
        options: ["Front Drink Chiller", "Main Beverage Aisle", "Cashier Counter Promo", "Other Shelf"],
        note: "",
        required: true,
      },
    ]);
  };

  const handleAssignLibraryTask = (libTaskId: string) => {
    if (!libTaskId) return;
    if (campaignTasks.length >= 2) {
      showToast("Maximum 2 additional tasks allowed besides Core Task #1", "error");
      return;
    }
    if (campaignTasks.some((t) => t.id === libTaskId)) {
      showToast("This question is already assigned to this campaign", "error");
      return;
    }
    const found = taskLibrary.find((t) => t.id === libTaskId);
    if (!found) return;
    setCampaignTasks((prev) => [
      ...prev,
      {
        id: found.id,
        title: found.title,
        question: found.question,
        type: found.type,
        options: found.options || [],
        min_range: found.min_range ?? 1,
        max_range: found.max_range ?? 10,
        note: found.note || "",
        required: true,
      },
    ]);
    setSelectedLibraryTaskId("");
  };

  const handleUpdateTask = (idx: number, patch: Partial<CashbackTaskItem>) => {
    setCampaignTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const handleRemoveTask = (idx: number) => {
    setCampaignTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  // Central Task Library CRUD
  const handleOpenTaskModal = (taskItem?: CashbackTaskItem) => {
    if (taskItem) {
      setEditingTask(taskItem);
      setTaskFormTitle(taskItem.title);
      setTaskFormQuestion(taskItem.question);
      setTaskFormType(taskItem.is_system_core ? "range_number" : taskItem.type);
      setTaskFormOptions((taskItem.options || []).join(", "));
      setTaskFormMinRange(taskItem.min_range ?? 1);
      setTaskFormMaxRange(taskItem.max_range ?? 10);
      setTaskFormNote(taskItem.note || "");
    } else {
      setEditingTask(null);
      setTaskFormTitle("");
      setTaskFormQuestion("");
      setTaskFormType("radio_select");
      setTaskFormOptions("Front Chiller, Main Aisle, Counter Promo");
      setTaskFormMinRange(1);
      setTaskFormMaxRange(10);
      setTaskFormNote("");
    }
    setShowTaskModal(true);
  };

  const handleSaveLibraryTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim() || !taskFormQuestion.trim()) {
      showToast("Please provide both title and question text", "error");
      return;
    }
    setSavingTask(true);
    try {
      const isCore = editingTask?.id === "task_product_movement" || editingTask?.is_system_core;
      const opts =
        taskFormType === "radio_select" || taskFormType === "multi_select"
          ? taskFormOptions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      const res = await fetch(`${WORKER_URL}/api/hsg-app/cashback/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTask?.id || undefined,
          title: taskFormTitle.trim(),
          question: taskFormQuestion.trim(),
          type: isCore ? "range_number" : taskFormType,
          options: opts,
          min_range: isCore ? 1 : Number(taskFormMinRange),
          max_range: isCore ? 10 : Number(taskFormMaxRange),
          note: taskFormNote.trim(),
          is_system_core: Boolean(isCore),
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to save question");
      showToast("Question saved to Task Library", "success");
      setShowTaskModal(false);
      loadLiveData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to save question", "error");
    } finally {
      setSavingTask(false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeletingTask(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/tasks/${encodeURIComponent(taskToDelete.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete question");
      }
      showToast("Question deleted from Task Library", "success");
      setTaskToDelete(null);
      loadLiveData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to delete question", "error");
    } finally {
      setDeletingTask(false);
    }
  };

  // Milestone target row update
  const handleUpdateMilestoneRow = (idx: number, patch: Partial<StoreVisitMilestone>) => {
    setMilestoneTargets((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m;
        const next = { ...m, ...patch };
        if (next.reward_type === "extra_cash") {
          next.reward_label = `$${Number(next.reward_value || 4).toFixed(0)}`;
        } else if (next.reward_type === "extra_percent") {
          next.reward_label = `+${next.reward_value || 2}%`;
        } else if (next.reward_type === "extra_points") {
          next.reward_label = `+${Number(next.reward_value || 50)} pts`;
        } else {
          next.reward_label = "Redeem Point";
        }
        return next;
      })
    );
  };

  const formatDate = (ts: number) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRewardGiven = (
    rewardGiven?: any,
    fallbackCashback?: any,
    rewardObj?: any
  ): string => {
    if (typeof rewardGiven === "string" && rewardGiven.trim()) {
      return rewardGiven;
    }
    const r =
      rewardGiven && typeof rewardGiven === "object"
        ? rewardGiven
        : rewardObj && typeof rewardObj === "object"
        ? rewardObj
        : null;
    if (r) {
      const cb = Number(
        r.cashback !== undefined ? r.cashback : r.cash !== undefined ? r.cash : 0
      );
      const pts = Number(r.points !== undefined ? r.points : 0);
      if (cb > 0 && pts > 0) return `$${cb.toFixed(2)} + ${pts} pts`;
      if (pts > 0) return `${pts} pts`;
      if (cb > 0) return `$${cb.toFixed(2)} Cashback`;
    }
    const fallbackNum = Number(fallbackCashback || 0);
    if (fallbackNum > 0) {
      return `$${fallbackNum.toFixed(2)} Cashback`;
    }
    return "$0.00";
  };

  // Filtered campaigns
  const visibleCampaigns = campaigns.filter((c) => {
    const matchesTab = leftTab === "active" ? !c.is_archived : c.is_archived;
    if (!matchesTab) return false;
    if (campaignSearch.trim()) {
      const q = campaignSearch.toLowerCase();
      return (
        (c.campaign_name || "").toLowerCase().includes(q) ||
        (c.brand_name || "").toLowerCase().includes(q) ||
        (c.product_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered claims:
  // - On initial load (selectedCampaignId === "ALL"), displays all cashback claims
  // - When a campaign card is clicked, filters by that campaign
  // - Filters by Claim Status (ALL / pending / credited / rejected)
  // - Filters by Start Date and End Date (default 3 weeks range)
  const filteredClaims = claims.filter((clm) => {
    // 0. Status Filter
    if (claimStatusFilter !== "ALL") {
      if (claimStatusFilter === "credited") {
        if (clm.status !== "credited" && clm.status !== "approved") return false;
      } else if (clm.status !== claimStatusFilter) {
        return false;
      }
    }

    // 1. Campaign Filter (Active Drops)
    if (claimCampaignFilter !== "ALL" && clm.campaign_id !== claimCampaignFilter) return false;
    if (selectedCampaignId !== "ALL" && clm.campaign_id !== selectedCampaignId) return false;

    // 2. Date Range Filter
    if (claimStartDate) {
      const startMs = new Date(`${claimStartDate}T00:00:00`).getTime();
      if (!isNaN(startMs) && clm.timestamp < startMs) return false;
    }
    if (claimEndDate) {
      const endMs = new Date(`${claimEndDate}T23:59:59.999`).getTime();
      if (!isNaN(endMs) && clm.timestamp > endMs) return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        clm.user_nickname.toLowerCase().includes(q) ||
        clm.user_phone.includes(q) ||
        clm.transaction_id.toLowerCase().includes(q) ||
        clm.matched_outlet_name.toLowerCase().includes(q) ||
        clm.product_name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* TopBar Navigation Tabs Integration */}
      <NavigationTabs
        tabs={topTabs}
        activeTabId={activeTab}
        onTabSelect={setActiveTab}
      />

      {/* Sub-Tabs per Pillar - Only rendered when sub-tabs exist */}
      {(activeTab === "Cashback" || activeTab === "Shop" || activeTab === "Community" || activeTab === "Members") && (
        <div className="px-4 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Sub-Tabs */}
          {activeTab === "Cashback" && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 text-xs">
              {(
                [
                  { id: "queue", label: "Receipt Submissions" },
                  { id: "campaigns", label: "Campaigns" },
                  { id: "store_outlets", label: "Store Outlets" },
                ] as { id: string; label: string }[]
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCashbackSubTab(st.id as any)}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                    cashbackSubTab === st.id
                      ? "bg-white text-[#0B57D0] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "Shop" && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 text-xs">
              {(
                [
                  { id: "catalog", label: "Catalog Product", count: merchCatalog.length || 0 },
                  { id: "orders", label: "Orders", count: merchOrders.filter((o) => o.status === "pending").length },
                ] as { id: string; label: string; count?: number }[]
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setShopSubTab(st.id as any)}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                    shopSubTab === st.id
                      ? "bg-white text-[#0B57D0] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>{st.label}</span>
                  {Boolean(st.count && st.count > 0) && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-[#0B57D0] font-medium">
                      {st.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTab === "Community" && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 text-xs">
              {(
                [
                  { id: "events", label: "Events & RSVPs" },
                  { id: "contests", label: "Quizzes & Contests" },
                  { id: "news", label: "Feed & News" },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCommunitySubTab(st.id as any)}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold transition ${
                    communitySubTab === st.id
                      ? "bg-white text-[#0B57D0] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === "Members" && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 text-xs">
              {(
                [
                  { id: "members", label: "Members" },
                  { id: "withdrawals", label: "PayNow Payouts" },
                ] as { id: string; label: string }[]
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setMembersSubTab(st.id as any)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    membersSubTab === st.id
                      ? "bg-white text-zinc-950 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Contextual Action Button */}
          <div className="flex items-center gap-2">
            {activeTab === "Shop" && shopSubTab === "catalog" && (
              <button
                type="button"
                onClick={() => setMerchCreateTrigger((n) => n + 1)}
                className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            )}
            {activeTab === "Community" && communitySubTab === "contests" && (
              <button
                type="button"
                onClick={() => setContestCreateTrigger((n) => n + 1)}
                className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Contest</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE VIEWPORT */}
      {activeTab === "Dashboard" ? (
        <HsgOverviewTab
          claims={claims}
          withdrawals={withdrawals}
          events={events}
          eventRsvps={eventRsvps}
          contests={contests}
          contestSubmissions={contestSubmissions}
          users={users}
          transactions={transactions}
          loading={loading}
          onNavigateTab={handleNavigateFromOverview}
        />
      ) : activeTab === "Shop" ? (
        <HsgShopTab

          merch={merchCatalog}
          orders={merchOrders}
          subView={shopSubTab}
          onRefresh={() => loadLiveData(true)}
          openCreateTrigger={merchCreateTrigger}
        />
      ) : activeTab === "Settings" ? (
        <HsgSettingsTab
          settings={hsgSettings}
          onRefresh={() => loadLiveData(true)}
        />
      ) : activeTab === "Community" ? (
        communitySubTab === "contests" ? (
          <HsgContestTab
            contests={contests}
            submissions={contestSubmissions}
            loading={loading}
            onRefresh={() => loadLiveData(true)}
            openCreateTrigger={contestCreateTrigger}
          />
        ) : communitySubTab === "news" ? (
          <HsgNewsTab
            announcements={announcements}
            highlights={highlights}
            users={users}
            onRefresh={() => loadLiveData(true)}
          />
        ) : (
          <HsgEventsTab
            events={events}
            rsvps={eventRsvps}
            onRefresh={() => loadLiveData(true)}
          />
        )
      ) : activeTab === "Members" ? (
        <HsgMembersTab
          users={users}
          withdrawals={withdrawals}
          loading={loading}
          onRefresh={() => loadLiveData(true)}
          subView={membersSubTab}
          eventRsvps={eventRsvps}
          contestSubmissions={contestSubmissions}
          merchOrders={merchOrders}
        />
      ) : cashbackSubTab === "queue" ? (
        <section className="flex-1 h-full flex flex-col bg-white overflow-hidden font-primary">
          {/* Controls & Filter Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Actions when items are selected */}
              {selectedClaimIds.length > 0 && (
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-blue-50/70 border border-blue-200">
                  <span className="text-[11px] font-medium text-[#0B57D0] px-1.5">
                    {selectedClaimIds.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkRunCheck}
                    disabled={bulkChecking}
                    className="h-7 px-2.5 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-medium flex items-center gap-1 transition disabled:opacity-50"
                    title="Run verification check on all selected receipts"
                  >
                    {bulkChecking ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    <span>Run Check ({selectedClaimIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkApprove}
                    disabled={bulkApproving}
                    className="h-7 px-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium flex items-center gap-1 transition disabled:opacity-50"
                    title="Approve valid receipts only"
                  >
                    {bulkApproving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    <span>
                      Bulk Approve ({claims.filter((c) => selectedClaimIds.includes(c.id) && (c.diagnose_status || "").trim() === "valid").length})
                    </span>
                  </button>
                </div>
              )}

              <span className="text-xs font-medium text-slate-600 mr-1">Status:</span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs flex-wrap">
                <button
                  type="button"
                  onClick={() => setClaimStatusFilter("ALL")}
                  className={`h-7 px-2.5 rounded-md text-[11px] transition ${
                    claimStatusFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-xs font-medium"
                      : "text-slate-600 hover:text-slate-900 font-normal"
                  }`}
                >
                  All ({claims.length})
                </button>
                <button
                  type="button"
                  onClick={() => setClaimStatusFilter("pending")}
                  className={`h-7 px-2.5 rounded-md text-[11px] flex items-center gap-1.5 transition ${
                    claimStatusFilter === "pending"
                      ? "bg-white text-slate-900 shadow-xs font-medium"
                      : "text-slate-600 hover:text-slate-900 font-normal"
                  }`}
                >
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Pending</span>
                  {claims.filter((c) => c.status === "pending" || !c.diagnose_status || c.diagnose_status === "pending check").length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/80 text-slate-700">
                      {claims.filter((c) => c.status === "pending" || !c.diagnose_status || c.diagnose_status === "pending check").length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setClaimStatusFilter("credited")}
                  className={`h-7 px-2.5 rounded-md text-[11px] transition ${
                    claimStatusFilter === "credited"
                      ? "bg-white text-slate-900 shadow-xs font-medium"
                      : "text-slate-600 hover:text-slate-900 font-normal"
                  }`}
                >
                  Approved ({claims.filter((c) => c.status === "credited" || c.status === "approved" || c.diagnose_status === "valid & approve").length})
                </button>
                <button
                  type="button"
                  onClick={() => setClaimStatusFilter("rejected")}
                  className={`h-7 px-2.5 rounded-md text-[11px] transition ${
                    claimStatusFilter === "rejected"
                      ? "bg-white text-slate-900 shadow-xs font-medium"
                      : "text-slate-600 hover:text-slate-900 font-normal"
                  }`}
                >
                  Rejected ({claims.filter((c) => c.status === "rejected" || c.diagnose_status === "valid & rejected").length})
                </button>
              </div>

              {/* Campaign Filter dropdown */}
              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Campaign:</span>
                <select
                  value={claimCampaignFilter}
                  onChange={(e) => setClaimCampaignFilter(e.target.value)}
                  className="h-7 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B57D0]"
                >
                  <option value="ALL">All Active Campaigns</option>
                  {campaigns
                    .filter((c) => !c.is_archived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title || c.campaign_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member, phone, store..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 w-52 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-500">From</span>
                <input
                  type="date"
                  value={claimStartDate}
                  onChange={(e) => setClaimStartDate(e.target.value)}
                  className="h-6 text-xs text-slate-800 outline-none bg-transparent"
                />
                <span className="text-[11px] text-slate-400">to</span>
                <input
                  type="date"
                  value={claimEndDate}
                  onChange={(e) => setClaimEndDate(e.target.value)}
                  className="h-6 text-xs text-slate-800 outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Submissions Data Table */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 sticky top-0 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-semibold tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredClaims.length > 0 && selectedClaimIds.length === filteredClaims.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClaimIds(filteredClaims.map((c) => c.id));
                        } else {
                          setSelectedClaimIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Submit By</th>
                  <th className="py-2.5 px-3">Purchase ($)</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Receipt</th>
                  <th className="py-2.5 px-3">Reward Give</th>
                  <th className="py-2.5 px-3">Diagnose Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                      No receipt submissions found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((clm) => {
                    const isSelected = selectedClaimIds.includes(clm.id);
                    const phoneDigits = (clm.user_phone || "").replace(/\D/g, "");
                    const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : (phoneDigits || "----");
                    const submitByText = `${last4} ${clm.user_nickname || "Member"}`;
                    const purchaseVal = Number(
                      clm.total_purchase !== undefined && clm.total_purchase !== null
                        ? clm.total_purchase
                        : (clm.receipt_amount || 0)
                    );
                    const qtyVal =
                      clm.total_qty !== undefined && clm.total_qty !== null
                        ? clm.total_qty
                        : (clm.qty || 1);

                    const diag = (clm.diagnose_status || "").trim();
                    const status = clm.status || "";

                    return (
                      <tr
                        key={clm.id}
                        className={`transition ${isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/60"}`}
                      >
                        {/* 1. Selection Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClaimIds((prev) => [...prev, clm.id]);
                              } else {
                                setSelectedClaimIds((prev) => prev.filter((id) => id !== clm.id));
                              }
                            }}
                            className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0] cursor-pointer"
                          />
                        </td>

                        {/* 2. Date */}
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {(() => {
                            const ts = clm.created_at || clm.timestamp || Date.now();
                            const d = new Date(ts);
                            const day = String(d.getDate()).padStart(2, "0");
                            const mo = String(d.getMonth() + 1).padStart(2, "0");
                            const yr = d.getFullYear();
                            const hh = String(d.getHours()).padStart(2, "0");
                            const mm = String(d.getMinutes()).padStart(2, "0");
                            return `${day}/${mo}/${yr} ${hh}:${mm}`;
                          })()}
                        </td>

                        {/* 3. Submit By: 4 digit phone number and name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-[11px] font-medium">{last4}</span>
                            <span className="font-medium text-slate-900">{clm.user_nickname || "Member"}</span>
                          </div>
                        </td>

                        {/* 4. Purchase ($): Amount Paid (view only here, edit inside review window) */}
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                          ${purchaseVal.toFixed(2)}
                        </td>

                        {/* 5. Qty: Total items (view only here, edit inside review window) */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-normal font-mono text-xs">
                            {qtyVal}
                          </span>
                        </td>

                        {/* 6. Receipt: Image icon + ! icon */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {clm.receipt_photo_url ? (
                              <button
                                type="button"
                                onClick={() => setLightboxImageUrl(clm.receipt_photo_url)}
                                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-[#0B57D0] text-slate-600 flex items-center justify-center transition border border-slate-200"
                                title="View Receipt Photo"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic">No Photo</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setOcrDataClaim(clm)}
                              className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 hover:text-slate-800 text-slate-600 flex items-center justify-center transition border border-slate-200"
                              title="View Receipt Details"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* 7. Reward Give: Display no edit */}
                        <td className="py-2.5 px-3 font-normal text-slate-800">
                          {formatRewardGiven(clm.reward_given, clm.cashback_amount, clm.reward)}
                        </td>

                        {/* 8. Diagnose Status badge */}
                        <td className="py-2.5 px-3">
                          {(() => {
                            if (diag.startsWith("duplicate receipt found") || diag === "duplicate_receipt") {
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Duplicate Receipt</span>
                                </span>
                              );
                            }
                            if (diag === "store not register") {
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                  <Store className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>Store Not Registered</span>
                                </span>
                              );
                            }
                            if (diag === "valid & approve" || status === "approved" || status === "credited") {
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Valid & Approve</span>
                                </span>
                              );
                            }
                            if (diag === "valid & rejected" || status === "rejected") {
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
                                  <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Valid & Rejected</span>
                                </span>
                              );
                            }
                            if (diag === "valid") {
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200 whitespace-nowrap">
                                  <Check className="w-3 h-3 text-[#0B57D0] shrink-0" />
                                  <span>Valid</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Pending Check</span>
                              </span>
                            );
                          })()}
                        </td>

                        {/* 9. Action: Run Check, Review, Read Answer, Log */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleRunCheckSingle(clm)}
                              disabled={runningCheckId === clm.id}
                              className="h-6 px-2.5 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-medium transition flex items-center gap-1 disabled:opacity-50"
                              title="Run verification check"
                            >
                              {runningCheckId === clm.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-2.5 h-2.5" />
                              )}
                              <span>Run Check</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReviewModal(clm)}
                              className="h-6 px-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-normal border border-slate-200 transition"
                              title="Review receipt details and adjust purchase/qty"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              onClick={() => setReadAnswerClaim(clm)}
                              className="h-6 px-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-normal border border-slate-200 transition"
                              title="Read submitted survey & velocity answers"
                            >
                              Read Answer
                            </button>
                            <button
                              type="button"
                              onClick={() => setLogClaim(clm)}
                              className="w-6 h-6 rounded-md bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 transition flex items-center justify-center shrink-0"
                              title="View Activity & Audit Log"
                            >
                              <History className="w-3.5 h-3.5" />
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
      ) : cashbackSubTab === "store_outlets" ? (
        /* =====================================================================
           SUB-TAB: STORE OUTLETS DIRECTORY (FOR 80% OCR SIMILARITY MATCHING)
        ===================================================================== */
        <section className="flex-1 h-full flex flex-col bg-white overflow-hidden font-primary">
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">Store Outlets Mapping Database</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#D3E3FD]/60 text-[#0B57D0]">
                {storeOutlets.length} Outlets Registered
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search store name, ID or address..."
                  value={storeOutletSearch}
                  onChange={(e) => setStoreOutletSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 w-64 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewStoreOutletId("");
                  setNewStoreOutletName("");
                  setNewStoreOutletAddress("");
                  setNewStoreOutletBrand("");
                  setShowAddStoreOutletModal(true);
                }}
                className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Store Outlet</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 sticky top-0 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-medium tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3">Outlet ID</th>
                  <th className="py-2.5 px-3">Store Name</th>
                  <th className="py-2.5 px-3">Store Address</th>
                  <th className="py-2.5 px-3">Brand / Chain</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {storeOutlets.filter((st) => {
                  if (!storeOutletSearch.trim()) return true;
                  const q = storeOutletSearch.toLowerCase();
                  return (
                    st.id.toLowerCase().includes(q) ||
                    st.store_name.toLowerCase().includes(q) ||
                    st.store_address.toLowerCase().includes(q) ||
                    (st.brand || "").toLowerCase().includes(q)
                  );
                }).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                      No store outlets found. Click "Add Store Outlet" to register new mapping records.
                    </td>
                  </tr>
                ) : (
                  storeOutlets
                    .filter((st) => {
                      if (!storeOutletSearch.trim()) return true;
                      const q = storeOutletSearch.toLowerCase();
                      return (
                        st.id.toLowerCase().includes(q) ||
                        st.store_name.toLowerCase().includes(q) ||
                        st.store_address.toLowerCase().includes(q) ||
                        (st.brand || "").toLowerCase().includes(q)
                      );
                    })
                    .map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{st.id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{st.store_name}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{st.store_address}</td>
                        <td className="py-2.5 px-3 font-normal text-slate-700">{st.brand || "-"}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteStoreOutlet(st.id)}
                            className="w-7 h-7 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center transition"
                            title="Delete Outlet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* =====================================================================
           SUB-TAB 2: CAMPAIGNS (CLEAN FULL-WIDTH GRID)
        ===================================================================== */
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-50/30">
          {/* Filter & Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              {/* Active Drops vs Archive */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setLeftTab("active")}
                  className={`h-7 px-3 rounded-md text-xs transition flex items-center gap-1.5 ${
                    leftTab === "active"
                      ? "bg-white text-zinc-950 shadow-xs font-medium"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  <span>Active Drops</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#D3E3FD]/60 text-[#0B57D0] font-medium">
                    {campaigns.filter((c) => !c.is_archived).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("archive")}
                  className={`h-7 px-3 rounded-md text-xs transition flex items-center gap-1.5 ${
                    leftTab === "archive"
                      ? "bg-white text-zinc-950 shadow-xs font-medium"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  <span>Archive</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 text-zinc-600 font-medium">
                    {campaigns.filter((c) => c.is_archived).length}
                  </span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaign or brand..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 w-56 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Campaign</span>
              </button>
            </div>
          </div>

          {/* Campaigns Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {visibleCampaigns.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-zinc-800">
                  {leftTab === "active" ? "No Active Drops" : "No Archived Campaigns"}
                </div>
                <p className="text-[11px] text-zinc-500 max-w-sm mt-0.5">
                  {leftTab === "active"
                    ? "Create your first cashback drop to let customers submit receipts and unlock rewards."
                    : "Archived campaigns will appear here when closed."}
                </p>
                {leftTab === "active" && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    className="mt-3 h-8 px-3.5 rounded-lg bg-[#0B57D0] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs hover:bg-[#0842A0] transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Campaign</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleCampaigns.map((camp) => {
                  const linkedClaimsCount = claims.filter((c) => c.campaign_id === camp.id).length;
                  const isArchived = Boolean(camp.is_archived);
                  const campName = camp.campaign_name;
                  const flyerImg =
                    camp.promo_card_url ||
                    camp.banner_image_url ||
                    camp.product_image_url;
                  return (
                    <div
                      key={camp.id}
                      className={`bg-white rounded-xl border transition shadow-xs flex flex-col overflow-hidden ${
                        !camp.is_active && !isArchived
                          ? "opacity-75 border-slate-200"
                          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      {/* Banner / Flyer image */}
                      <div className="h-32 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                        {flyerImg ? (
                          <img
                            src={flyerImg}
                            alt={campName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                            <Tag className="w-6 h-6 text-slate-300" />
                            <span className="text-[10px] font-medium">No flyer image</span>
                          </div>
                        )}
                        <span
                          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-medium shadow-xs ${
                            isArchived
                              ? "bg-slate-700 text-white"
                              : camp.is_active
                              ? "bg-[#0B57D0] text-white"
                              : "bg-slate-500 text-white"
                          }`}
                        >
                          {isArchived ? "Archived" : camp.is_active ? `Live Active • Tab #${camp.display_order || 1}` : "Inactive"}
                        </span>
                        {camp.brand_name && (
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/95 backdrop-blur-xs text-slate-800 border border-slate-200 shadow-2xs">
                            {camp.brand_name}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900 line-clamp-1">
                            {campName}
                          </h3>
                          <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>
                              {formatDate(camp.start_timestamp)} - {formatDate(camp.end_timestamp)}
                            </span>
                          </div>

                          {/* Reward Info */}
                          <div className="mt-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-zinc-600 font-normal">Reward:</span>
                            <div className="flex items-center gap-1 font-semibold text-[#0B57D0]">
                              {(() => {
                                const rType = camp.reward_type || (camp as any).reward?.type || (camp.purchase_reward_mode === "points" ? "points" : "cashback");
                                const rCash = Number(camp.reward_cash !== undefined ? camp.reward_cash : ((camp as any).reward?.cash !== undefined ? (camp as any).reward.cash : (camp.cashback_amount || 0)));
                                const rPoints = Number(camp.reward_points !== undefined ? camp.reward_points : ((camp as any).reward?.points !== undefined ? (camp as any).reward.points : 0));
                                if (rType === "both") {
                                  return <span>${rCash.toFixed(2)} & ${rPoints} Pts</span>;
                                }
                                if (rType === "points") {
                                  return <span>${rPoints || rCash} Pts</span>;
                                }
                                return <span>${rCash.toFixed(2)}</span>;
                              })()}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                            <span>Claims submitted:</span>
                            <span className="font-medium text-zinc-800">
                              {linkedClaimsCount}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          {!isArchived ? (
                            <div className="flex items-center gap-1.5">
                              {/* Toggle live active switch */}
                              <button
                                type="button"
                                onClick={() => handleTogglePublish(camp, !camp.is_active)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  camp.is_active ? "bg-[#0B57D0]" : "bg-slate-300"
                                }`}
                                title={camp.is_active ? "Click to set Inactive" : "Click to set Active"}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    camp.is_active ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                              <span className="text-[10px] font-medium text-zinc-500">
                                {camp.is_active ? "Live" : "Off"}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevokeArchive(camp)}
                              className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-zinc-700 inline-flex items-center gap-1 transition"
                            >
                              <RotateCcw className="w-3 h-3 text-zinc-500" />
                              <span>Restore</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenModal(camp)}
                              className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-zinc-700 inline-flex items-center gap-1 transition"
                            >
                              <Pencil className="w-3 h-3 text-zinc-500" />
                              <span>Edit</span>
                            </button>

                            {!isArchived ? (
                              <button
                                type="button"
                                onClick={() => handleArchiveCampaign(camp)}
                                className="h-7 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-zinc-500 hover:text-zinc-800 transition"
                                title="Move to Archive"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={linkedClaimsCount > 0}
                                onClick={() => {
                                  if (linkedClaimsCount > 0) {
                                    showToast(
                                      `Cannot delete: Linked to ${linkedClaimsCount} customer claim(s)`,
                                      "error"
                                    );
                                    return;
                                  }
                                  setCampaignToDelete(camp);
                                }}
                                className={`h-7 px-2 rounded-md transition ${
                                  linkedClaimsCount > 0
                                    ? "border border-slate-200 bg-slate-100 text-zinc-300 opacity-50 cursor-not-allowed"
                                    : "border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                                }`}
                                title={
                                  linkedClaimsCount > 0
                                    ? `Cannot delete: Linked to ${linkedClaimsCount} customer claim(s)`
                                    : "Delete Campaign Permanently"
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 1: CREATE / EDIT CASHBACK CAMPAIGN
      ===================================================================== */}
      {/* =====================================================================
          DIALOG MODAL 1: CREATE / EDIT CASHBACK CAMPAIGN (2-COLUMN SIMPLIFIED)
      ===================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-primary">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  {editingCampaignId ? "Edit Cashback Campaign" : "Create Cashback Campaign"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure campaign display details, rewards, store unlocks, and task survey.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <form
              onSubmit={handleSaveCampaign}
              className="flex-1 min-h-0 overflow-y-auto p-6 text-xs bg-white space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ---------------- LEFT COLUMN: CAMPAIGN INFO ---------------- */}
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0B57D0] border-b border-slate-100 pb-1.5">
                    Campaign Details
                  </div>

                  {/* Campaign Title */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Campaign Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={campTitle}
                      onChange={(e) => setCampTitle(e.target.value)}
                      placeholder="e.g. BOOM+ Weekly Hydration Drop"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B57D0] outline-none font-semibold text-slate-900"
                    />
                  </div>

                  {/* Brand Involved */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Brand Involved
                    </label>
                    <input
                      type="text"
                      value={campBrand}
                      onChange={(e) => setCampBrand(e.target.value)}
                      placeholder="e.g. Brand Name"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B57D0] outline-none font-semibold text-slate-900"
                    />
                  </div>
                  {/* Display Order (Tab Position 1 to 4) */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Display Order (Tab Position) <span className="text-[#0B57D0]">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2 w-full">
                      {[
                        { num: 1, label: "Tab 1", sub: "Default" },
                        { num: 2, label: "Tab 2", sub: "" },
                        { num: 3, label: "Tab 3", sub: "" },
                        { num: 4, label: "Tab 4", sub: "" },
                      ].map(({ num, label, sub }) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCampDisplayOrder(num)}
                          className={`w-full h-10 rounded-lg font-bold text-xs transition border flex flex-col items-center justify-center cursor-pointer px-2 ${
                            campDisplayOrder === num
                              ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span>{label}</span>
                          {sub && (
                            <span
                              className={`text-[9px] font-medium leading-none mt-0.5 ${
                                campDisplayOrder === num ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              ({sub})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Determines tab order in HSG+ mobile app (up to 4 active campaigns). Tab 1 opens first.
                    </p>
                  </div>


                  {/* Campaign Description */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Campaign Description
                    </label>
                    <textarea
                      rows={3}
                      value={campDescription}
                      onChange={(e) => setCampDescription(e.target.value)}
                      placeholder="Brief overview explaining the campaign for members..."
                      className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B57D0] outline-none text-slate-900 resize-none"
                    />
                  </div>

                  {/* Campaign Instructions */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Campaign Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={campInstructions}
                      onChange={(e) => setCampInstructions(e.target.value)}
                      placeholder="Step 1: Purchase product at participating store. Step 2: Upload receipt photo..."
                      className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B57D0] outline-none text-slate-900 resize-none"
                    />
                  </div>

                  {/* Campaign Rule */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Campaign Rule
                    </label>
                    <input
                      type="text"
                      value={campRules}
                      onChange={(e) => setCampRules(e.target.value)}
                      placeholder="e.g. Maximum 1 receipt submission per member per day"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B57D0] outline-none text-slate-900"
                    />
                  </div>

                  {/* Campaign Poster (4:5 or 1:1) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-zinc-700">
                        Campaign Poster <span className="text-slate-400 font-normal">(4:5 or 1:1)</span>
                      </label>
                      {campPosterUrl && (
                        <button
                          type="button"
                          onClick={() => setCampPosterUrl("")}
                          className="text-[11px] text-rose-600 hover:underline font-semibold"
                        >
                          Remove Poster
                        </button>
                      )}
                    </div>

                    {campPosterUrl ? (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center group">
                        <img
                          src={campPosterUrl}
                          alt="Campaign Poster"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setCampPosterUrl("")}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white hover:bg-rose-600 transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#0B57D0] rounded-lg p-4 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition">
                        {uploadingPoster ? (
                          <div className="flex flex-col items-center gap-1.5 py-3">
                            <Loader2 className="w-5 h-5 animate-spin text-[#0B57D0]" />
                            <span className="text-[11px] font-semibold text-zinc-600">Uploading poster...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center">
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-xs font-medium text-zinc-700">Click to upload poster image</span>
                            <span className="text-[10px] text-zinc-400 mt-0.5">Ratio: 4:5 or 1:1 (PNG, JPG, WebP)</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPoster}
                          onChange={(e) => handleUploadImage(e, "poster")}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Period Start & End with Time */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Period (Start & End with Time)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Start Date & Time</span>
                        <input
                          type="datetime-local"
                          value={campStartTime}
                          onChange={(e) => setCampStartTime(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B57D0]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">End Date & Time</span>
                        <input
                          type="datetime-local"
                          value={campEndTime}
                          onChange={(e) => setCampEndTime(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#0B57D0]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ---------------- RIGHT COLUMN: REWARDS & TASKS ---------------- */}
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0B57D0] border-b border-slate-100 pb-1.5">
                    Rewards & Tasks
                  </div>

                  {/* Reward Type Selection: Dropdown + Compact Input */}
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Reward Type & Amount
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={campRewardType}
                        onChange={(e) => setCampRewardType(e.target.value as any)}
                        className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#0B57D0]"
                      >
                        <option value="cashback">Cashback ($)</option>
                        <option value="points">Points (pts)</option>
                        <option value="both">Cashback + Points</option>
                      </select>

                      {(campRewardType === "cashback" || campRewardType === "both") && (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={campRewardCash}
                            onChange={(e) => setCampRewardCash(Number(e.target.value))}
                            placeholder="1.00"
                            className="w-full h-8 pl-6 pr-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#0B57D0]"
                          />
                        </div>
                      )}

                      {(campRewardType === "points" || campRewardType === "both") && (
                        <div className="relative w-28">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={campRewardPoints}
                            onChange={(e) => setCampRewardPoints(Number(e.target.value))}
                            placeholder="50"
                            className="w-full h-8 pl-2.5 pr-8 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#0B57D0]"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400">pts</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unlock More Reward (Max 3 Tiers) */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-zinc-800">
                        Unlock More Reward <span className="text-slate-400 font-normal">(Max 3 Tiers)</span>
                      </label>
                      <button
                        type="button"
                        disabled={campUnlockRewards.length >= 3}
                        onClick={() => {
                          if (campUnlockRewards.length < 3) {
                            const nextTier = campUnlockRewards.length + 1;
                            const defaultCash = nextTier * 2;
                            const defaultPts = nextTier * 50;
                            setCampUnlockRewards((prev) => [
                              ...prev,
                              {
                                tier: nextTier,
                                stores: nextTier * 2,
                                cash: defaultCash,
                                points: defaultPts,
                                reward: `$${defaultCash}.00 + ${defaultPts} pts`,
                              },
                            ]);
                          }
                        }}
                        className="text-[11px] font-semibold text-[#0B57D0] hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        + Add Unlock Reward
                      </button>
                    </div>

                    {campUnlockRewards.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">
                        No unlock tiers added. Click "+ Add Unlock Reward" to motivate members to visit multiple store outlets.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {campUnlockRewards.map((tier, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <span className="font-medium text-slate-700 text-[11px] shrink-0">
                              Tier #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-500">Visit</span>
                              <input
                                type="number"
                                min="1"
                                value={tier.stores}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCampUnlockRewards((prev) =>
                                    prev.map((t, i) => (i === idx ? { ...t, stores: val } : t))
                                  );
                                }}
                                className="w-12 h-7 px-1 text-center font-medium text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-[#0B57D0]"
                              />
                              <span className="text-[11px] text-slate-500">stores</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                              {/* Cash input */}
                              <div className="relative w-20">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tier.cash !== undefined ? tier.cash : (parseFloat(String(tier.reward || "").replace(/[^0-9.]/g, "")) || 0)}
                                  onChange={(e) => {
                                    const cVal = Number(e.target.value);
                                    setCampUnlockRewards((prev) =>
                                      prev.map((t, i) => {
                                        if (i !== idx) return t;
                                        const p = t.points || 0;
                                        const r = p > 0 ? `$${cVal.toFixed(2)} + ${p} pts` : `$${cVal.toFixed(2)}`;
                                        return { ...t, cash: cVal, reward: r };
                                      })
                                    );
                                  }}
                                  placeholder="0.00"
                                  className="w-full h-7 pl-5 pr-1 font-medium text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-[#0B57D0]"
                                />
                              </div>

                              {/* Points input */}
                              <div className="relative w-20">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={tier.points !== undefined ? tier.points : 0}
                                  onChange={(e) => {
                                    const pVal = Number(e.target.value);
                                    setCampUnlockRewards((prev) =>
                                      prev.map((t, i) => {
                                        if (i !== idx) return t;
                                        const c = t.cash !== undefined ? t.cash : (parseFloat(String(t.reward || "").replace(/[^0-9.]/g, "")) || 0);
                                        const r = c > 0 ? `$${c.toFixed(2)} + ${pVal} pts` : `${pVal} pts`;
                                        return { ...t, points: pVal, reward: r };
                                      })
                                    );
                                  }}
                                  placeholder="0"
                                  className="w-full h-7 pl-2 pr-7 font-medium text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-[#0B57D0]"
                                />
                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">pts</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setCampUnlockRewards((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                              title="Remove Tier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tasks (Max 4 Total: Task 1 Velocity + Custom Tasks 2, 3, 4) */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-semibold text-zinc-800">
                          Campaign Tasks & Questions
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Maximum 4 tasks (Task 1 Velocity check + up to 3 custom questions)
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={
                          (campVelocityTaskEnabled ? 1 : 0) + campCustomQuestions.length >= 4
                        }
                        onClick={() => {
                          const currentTotal = (campVelocityTaskEnabled ? 1 : 0) + campCustomQuestions.length;
                          if (currentTotal < 4) {
                            const nextQNum = campCustomQuestions.length + 2;
                            setCampCustomQuestions((prev) => [
                              ...prev,
                              { id: `q${nextQNum}`, question: "" },
                            ]);
                          }
                        }}
                        className="text-[11px] font-semibold text-[#0B57D0] hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        + Add Question
                      </button>
                    </div>

                    {/* Task 1: Store Velocity Task (Fixed Question) */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 text-[11px]">
                          Task #1 — Store Velocity Task (Fixed)
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={campVelocityTaskEnabled}
                            onChange={(e) => setCampVelocityTaskEnabled(e.target.checked)}
                            className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]"
                          />
                          <span className="text-[11px] font-medium text-slate-600">
                            {campVelocityTaskEnabled ? "Enabled" : "Hidden"}
                          </span>
                        </label>
                      </div>

                      {campVelocityTaskEnabled ? (
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <p className="text-[11px] font-medium text-slate-700">
                            "Ask Cashier, this product move out how many avr perday"
                          </p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <span
                                key={num}
                                className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium flex items-center justify-center border border-slate-200"
                              >
                                {num}
                              </span>
                            ))}
                            <span className="text-[10px] text-slate-400 ml-1">(Radio 1 - 10)</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">
                          Task 1 is hidden. Velocity data will rely solely on submitted receipt quantities.
                        </p>
                      )}
                    </div>

                    {/* Custom Tasks (2, 3, 4) */}
                    {campCustomQuestions.map((q, idx) => {
                      const taskNum = idx + 2;
                      return (
                        <div
                          key={q.id || idx}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-800 text-[11px]">
                              Task #{taskNum} (Custom Question)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCampCustomQuestions((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-slate-400 hover:text-rose-600 transition p-0.5"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCampCustomQuestions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, question: val } : item))
                              );
                            }}
                            placeholder="e.g. Which shelf was this item placed on?"
                            className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#0B57D0]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCampaign}
                  className="h-9 px-5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-98"
                >
                  {savingCampaign ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save & Launch Campaign</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 2: REVIEW WINDOW (RECEIPT, OCR DATA, EDIT PURCHASE & QTY, APPROVE/REJECT)
      ===================================================================== */}
      {reviewClaim && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-primary">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
                  <span>Review Receipt Submission</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {reviewClaim.transaction_id || reviewClaim.id}
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Submitted by <strong className="text-slate-800 font-medium">{reviewClaim.user_nickname}</strong> ({(() => { const p = (reviewClaim.user_phone || "").replace(/\D/g, ""); return p.length >= 4 ? `•••• ${p.slice(-4)}` : (p || "----"); })()})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewClaim(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: 2 Columns */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40">
              {/* Left Column: Receipt Photo */}
              <div className="space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-xs">Receipt Photo Preview</span>
                  {(reviewClaim.receipt_url || reviewClaim.receipt_photo_url) && (
                    <a
                      href={reviewClaim.receipt_url || reviewClaim.receipt_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#0B57D0] hover:underline flex items-center gap-1"
                    >
                      <span>Open Full Size</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex-1 min-h-[300px] max-h-[500px] rounded-xl bg-slate-900 border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                  {(reviewClaim.receipt_url || reviewClaim.receipt_photo_url) ? (
                    <img
                      src={reviewClaim.receipt_url || reviewClaim.receipt_photo_url}
                      alt="Receipt"
                      className="max-h-full max-w-full object-contain rounded-md cursor-pointer hover:opacity-95 transition"
                      onClick={() => setLightboxImageUrl(reviewClaim.receipt_url || reviewClaim.receipt_photo_url)}
                      title="Click to view full lightbox"
                    />
                  ) : (
                    <div className="py-12 text-center text-slate-400">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-500" />
                      <span>No receipt photo attached</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: OCR Details & Editable Purchase/Qty */}
              <div className="space-y-4 flex flex-col">
                {/* 1. OCR Data Card */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-medium text-slate-900 text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#0B57D0]" />
                      <span>Receipt Details</span>
                    </span>
                    
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500 shrink-0">Transaction Ref:</span>
                      <span className="font-mono font-medium text-slate-900 text-right">
                        {reviewClaim.ocr_data?.transaction_ref || reviewClaim.transaction_id || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500 shrink-0">Purchase Time & Date:</span>
                      <span className="font-normal text-slate-800 text-right">
                        {reviewClaim.ocr_data?.purchase_datetime || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500 shrink-0">Store Name:</span>
                      <span className="font-medium text-slate-900 text-right">
                        {reviewClaim.ocr_data?.store_name || reviewClaim.matched_outlet_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500 shrink-0">Store Address:</span>
                      <span className="font-normal text-slate-700 text-right max-w-[220px]">
                        {reviewClaim.ocr_data?.store_address || reviewClaim.raw_address || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-500 shrink-0">Assigned Store ID:</span>
                      <span className="font-mono font-medium text-[#0B57D0] text-right">
                        {reviewClaim.assign_store_id || reviewClaim.ocr_data?.assign_store_id || "Unregistered Outlet"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Admin Editable Purchase & Qty Card */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-medium text-slate-900 text-xs flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-[#0B57D0]" />
                      <span>Adjust Purchase & Quantity</span>
                    </span>
                    
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                        Purchase Amount ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-medium text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={reviewEditPurchase}
                          onChange={(e) => setReviewEditPurchase(e.target.value)}
                          className="w-full h-8 pl-6 pr-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#0B57D0]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                        Total Quantity Purchased
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={reviewEditQty}
                        onChange={(e) => setReviewEditQty(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={savingReview}
                      onClick={handleSaveReviewAmounts}
                      className="h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-[#0B57D0] shadow-2xs transition"
                    >
                      {savingReview ? "Saving..." : "Save Amounts"}
                    </button>
                  </div>
                </div>

                {/* 3. Diagnose Status Badge & Reward Information */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-medium block">Diagnose Status</span>
                    <span className="font-medium text-slate-800 mt-0.5 inline-block">
                      {reviewClaim.diagnose_status?.replace(/[{}]/g, "") || "Pending Check"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] uppercase font-medium block">Reward to Credit</span>
                    <span className="font-medium text-slate-900 font-mono text-sm">
                      {formatRewardGiven(reviewClaim.reward_given, reviewClaim.cashback_amount, reviewClaim.reward)}
                    </span>
                  </div>
                </div>

                {/* 4. Rejection Reason (Optional input when rejecting) */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                    Rejection Reason (if rejecting submission)
                  </label>
                  <input
                    type="text"
                    value={reviewRejectReason}
                    onChange={(e) => setReviewRejectReason(e.target.value)}
                    placeholder="e.g. Receipt unreadable or store not participating"
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Review Footer Actions: Reject & Approve */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setReviewClaim(null)}
                className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-medium text-zinc-700 transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingReview}
                  onClick={handleRejectFromReview}
                  className="h-9 px-4 rounded-lg bg-white border border-slate-300 hover:bg-rose-50 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition active:scale-98"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Reject Receipt</span>
                </button>

                <button
                  type="button"
                  disabled={savingReview}
                  onClick={handleApproveFromReview}
                  className="h-9 px-5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 transition active:scale-98 shadow-xs"
                >
                  {savingReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Approve & Credit Reward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 3: READ ANSWER MODAL (Q1 VELOCITY + CUSTOM QUESTIONS)
      ===================================================================== */}
      {readAnswerClaim && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-primary flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B57D0]" />
                  <span>Submitted Member Survey Answers</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Claim ID: <span className="font-mono font-medium text-zinc-800">{readAnswerClaim.transaction_id || readAnswerClaim.id}</span> • {readAnswerClaim.user_nickname}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReadAnswerClaim(null)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-zinc-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Task 1: Velocity Check */}
              <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#0B57D0]">
                  Task 1 — Velocity Check
                </span>
                <p className="font-medium text-slate-800 text-xs">
                  "Ask Cashier, this product move out how many avr perday"
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-500">Average Moving / Day:</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0B57D0] border border-blue-200 font-medium font-mono text-xs">
                    {(readAnswerClaim.answers?.q1 || readAnswerClaim.cashier_task_qty) ? `${readAnswerClaim.answers?.q1 || readAnswerClaim.cashier_task_qty} pcs` : "-"}
                  </span>
                </div>
              </div>

              {/* Custom Questions Answers */}
              {(() => {
                const ans = readAnswerClaim.answers || readAnswerClaim.task_answers || {};
                const otherKeys = Object.keys(ans).filter((k) => k !== "q1");

                if (otherKeys.length === 0) {
                  return (
                    <p className="text-slate-400 italic text-[11px] py-2">
                      No additional custom questions were submitted for this receipt.
                    </p>
                  );
                }

                return (
                  <div className="space-y-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      Custom Questions Answers
                    </span>
                    {otherKeys.map((key, idx) => (
                      <div
                        key={key}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
                      >
                        <span className="font-medium text-slate-700 font-mono text-[11px]">
                          Question #{idx + 2} ({key})
                        </span>
                        <div className="text-slate-900 font-medium">
                          {Array.isArray(ans[key]) ? ans[key].join(", ") : String(ans[key])}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setReadAnswerClaim(null)}
                className="h-8 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 4: OCR JSON VIEWER (! ICON MODAL)
      ===================================================================== */}
      {ocrDataClaim && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#0B57D0]" />
                  <span>Receipt Details</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Extracted from receipt submission
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOcrDataClaim(null)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-zinc-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono font-medium text-slate-900 text-right">
                    {ocrDataClaim.ocr_data?.transaction_ref || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Purchase Date & Time:</span>
                  <span className="font-normal text-slate-800 text-right">
                    {ocrDataClaim.ocr_data?.purchase_datetime || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Store Name:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {ocrDataClaim.ocr_data?.store_name || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Store Address:</span>
                  <span className="font-normal text-slate-700 text-right max-w-[260px]">
                    {ocrDataClaim.ocr_data?.store_address || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500">Assigned Store ID:</span>
                  <span className="font-mono font-medium text-[#0B57D0] text-right">
                    {ocrDataClaim.ocr_data?.assign_store_id || ocrDataClaim.assign_store_id || "Unassigned"}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setOcrDataClaim(null)}
                className="h-8 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 5: RECEIPT IMAGE LIGHTBOX PREVIEW
      ===================================================================== */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-2 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Receipt Lightbox"
              className="max-h-[82vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 6: ADD STORE OUTLET MODAL (OUTLET MAPPING DATABASE)
      ===================================================================== */}
      {showAddStoreOutletModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-primary">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#0B57D0]" />
                  <span>Register Store Outlet</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Used for store verification matching
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStoreOutletModal(false)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-zinc-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStoreOutlet} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Outlet ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStoreOutletId}
                  onChange={(e) => setNewStoreOutletId(e.target.value)}
                  placeholder="e.g. 7E-0142 or FP-CLEMENTI"
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono font-medium text-slate-900 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Store Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStoreOutletName}
                  onChange={(e) => setNewStoreOutletName(e.target.value)}
                  placeholder="e.g. 7-Eleven Clementi Ave 3"
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Store Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={newStoreOutletAddress}
                  onChange={(e) => setNewStoreOutletAddress(e.target.value)}
                  placeholder="e.g. Blk 442 Clementi Ave 3 #01-80, Singapore 120442"
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-[#0B57D0] resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Brand / Retail Chain (Optional)
                </label>
                <input
                  type="text"
                  value={newStoreOutletBrand}
                  onChange={(e) => setNewStoreOutletBrand(e.target.value)}
                  placeholder="e.g. 7-Eleven, FairPrice, Sheng Siong"
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStoreOutletModal(false)}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStoreOutlet}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-98 disabled:opacity-50"
                >
                  {savingStoreOutlet && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Outlet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE CAMPAIGN CONFIRMATION POPUP MODAL */}
      {campaignToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">
                  Delete Campaign Permanently?
                </h3>
                <p className="text-xs text-zinc-600 mt-2">
                  Are you sure you want to permanently delete campaign{" "}
                  <strong className="text-zinc-900 font-semibold">{campaignToDelete.campaign_name}</strong>?
                  This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCampaignToDelete(null)}
                className="text-zinc-400 hover:text-zinc-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingCampaign}
                onClick={() => setCampaignToDelete(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingCampaign}
                onClick={handleDeleteCampaign}
                className="h-8 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-98"
              >
                {deletingCampaign && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deletingCampaign ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 3: CREATE / EDIT TASK LIBRARY QUESTION
      ===================================================================== */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">
                  {editingTask ? "Edit Library Question" : "New Library Question"}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Reusable across any cashback campaign.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLibraryTask} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Task Title / Badge
                </label>
                <input
                  type="text"
                  value={taskFormTitle}
                  onChange={(e) => setTaskFormTitle(e.target.value)}
                  placeholder="e.g. Shelf Placement Check"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Question Text
                </label>
                <input
                  type="text"
                  value={taskFormQuestion}
                  onChange={(e) => setTaskFormQuestion(e.target.value)}
                  placeholder="e.g. Where did you pick up this product in the store?"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Answer Format
                </label>
                <select
                  value={taskFormType}
                  disabled={Boolean(
                    editingTask?.id === "task_product_movement" ||
                      editingTask?.is_system_core
                  )}
                  onChange={(e) => setTaskFormType(e.target.value as CashbackTaskType)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none font-semibold disabled:opacity-60"
                >
                  <option value="range_number">Range Number (e.g. 1 – 10)</option>
                  <option value="radio_select">Single Choice (Radio Select)</option>
                  <option value="multi_select">Multiple Choice (Multi Select)</option>
                  <option value="text">Free Text Input</option>
                </select>
              </div>

              {(taskFormType === "radio_select" || taskFormType === "multi_select") && (
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Options (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={taskFormOptions}
                    onChange={(e) => setTaskFormOptions(e.target.value)}
                    placeholder="Front Chiller, Main Aisle, Counter Promo"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Helper Note (Optional)
                </label>
                <input
                  type="text"
                  value={taskFormNote}
                  onChange={(e) => setTaskFormNote(e.target.value)}
                  placeholder="Optional instruction note under question"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5"
                >
                  {savingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOG MODAL 4: DELETE LIBRARY QUESTION CONFIRMATION
      ===================================================================== */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5">
            <h3 className="text-sm font-semibold text-zinc-950">
              Delete Question from Library?
            </h3>
            <p className="text-xs text-zinc-600 mt-2">
              Are you sure you want to delete{" "}
              <strong className="text-zinc-900">{taskToDelete.title}</strong>?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingTask}
                onClick={handleConfirmDeleteTask}
                className="h-8 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {deletingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Question</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT AMOUNT SPEND & QUANTITY (WITH AUDIT LOGGING)
      ===================================================================== */}
      {editSpendClaim && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-primary">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-[#0B57D0]" />
                  <span>Edit Amount Spend & Quantity</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Claim ID: <span className="font-mono font-medium text-zinc-800">{editSpendClaim.transaction_id || editSpendClaim.id}</span> • {editSpendClaim.user_nickname}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditSpendClaim(null)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-zinc-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Receipt photo thumbnail preview */}
              {editSpendClaim.receipt_photo_url && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <img
                    src={editSpendClaim.receipt_photo_url}
                    alt="Receipt"
                    className="w-14 h-14 object-cover rounded-md border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition"
                    onClick={() => {
                      if (editSpendClaim.receipt_photo_url) {
                        window.open(editSpendClaim.receipt_photo_url, "_blank");
                      }
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800 truncate">
                      {editSpendClaim.product_name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      Store: {editSpendClaim.matched_outlet_name || editSpendClaim.raw_address || "Unmapped"}
                    </div>
                    <a
                      href={editSpendClaim.receipt_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#0B57D0] hover:underline font-medium inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>View Receipt Photo Full Size</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Amount Spend ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editSpendAmount}
                      onChange={(e) => setEditSpendAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-9 pl-7 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#0B57D0] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Quantity Spend
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={editSpendQty}
                    onChange={(e) => setEditSpendQty(e.target.value)}
                    placeholder="1"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#0B57D0] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Audit Log Remark (Optional)
                </label>
                <input
                  type="text"
                  value={editSpendRemark}
                  onChange={(e) => setEditSpendRemark(e.target.value)}
                  placeholder="e.g. Misread $4.50 instead of $14.50 on blurred receipt"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-[#0B57D0] focus:bg-white"
                />
                <span className="block text-[10px] text-zinc-400 mt-1">
                  This note will be permanently recorded in the claim's activity audit trail.
                </span>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditSpendClaim(null)}
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSpend}
                onClick={handleSaveSpend}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition active:scale-98 disabled:opacity-50"
              >
                {savingSpend && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save & Log Activity</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CLAIM ACTIVITY & AUDIT LOG
      ===================================================================== */}
      {logClaim && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-primary flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0B57D0] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Claim Activity & Audit Log
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    TXN: <span className="font-mono font-medium text-zinc-800">{logClaim.transaction_id || logClaim.id}</span> • Member: {logClaim.user_nickname} ({(() => { const p = (logClaim.user_phone || "").replace(/\D/g, ""); return p.length >= 4 ? `•••• ${p.slice(-4)}` : (p || "----"); })()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogClaim(null)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-zinc-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audit Trail List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
              {(() => {
                const logs: any[] = [
                  ...(logClaim.logs || logClaim.verify?.logs || []),
                ];

                // If no logs recorded yet, show initial submission synthesized entry
                if (logs.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-600">Initial Receipt Submission</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Receipt submitted at {formatDate(logClaim.timestamp || Date.now())}. No manual admin edits recorded yet.
                      </p>
                    </div>
                  );
                }

                // Render logs in reverse chronological order (newest first)
                const sortedLogs = [...logs].reverse();

                return sortedLogs.map((lg: any, idx: number) => {
                  const act = lg.action || "activity";
                  const time = lg.timestamp ? formatDate(lg.timestamp) : "-";

                  let badgeColor = "bg-blue-50 text-[#0B57D0] border-blue-200";
                  let actionTitle = "Activity Logged";
                  let ActionIcon = Clock;

                  if (act === "edit_spend_qty") {
                    badgeColor = "bg-blue-50 text-[#0B57D0] border-blue-200";
                    actionTitle = "Amount Spend & Qty Adjusted";
                    ActionIcon = Pencil;
                  } else if (act === "store_assigned") {
                    badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                    actionTitle = "Store Location Assigned";
                    ActionIcon = MapPin;
                  } else if (act === "approved") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
                    actionTitle = "Receipt Approved & Credited";
                    ActionIcon = CheckCircle2;
                  } else if (act === "rejected") {
                    badgeColor = "bg-rose-50 text-rose-700 border-rose-200/80";
                    actionTitle = "Receipt Verification Rejected";
                    ActionIcon = XCircle;
                  } else if (act === "revoked") {
                    badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                    actionTitle = "Cashback Revoked";
                    ActionIcon = AlertTriangle;
                  } else if (act === "submitted") {
                    badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                    actionTitle = "Receipt Submitted";
                    ActionIcon = Upload;
                  }

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${badgeColor}`}>
                            <ActionIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-medium text-slate-900">{actionTitle}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{time}</span>
                      </div>

                      {/* Action specific details */}
                      {act === "edit_spend_qty" && (
                        <div className="p-2 rounded bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Spend Amount:</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-slate-400 line-through">
                                ${Number(lg.prev_amount || 0).toFixed(2)}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="font-medium text-[#0B57D0]">
                                ${Number(lg.new_amount || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Quantity:</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-slate-400 line-through">
                                {lg.prev_qty || 1}x
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="font-medium text-[#0B57D0]">
                                {lg.new_qty || 1}x
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {act === "store_assigned" && (
                        <div className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px] space-y-0.5">
                          <div className="font-medium text-slate-800">
                            {lg.outlet_name || lg.outlet_id}
                          </div>
                          {lg.raw_address && (
                            <div className="text-slate-500 text-[10px] truncate">
                              Address: {lg.raw_address}
                            </div>
                          )}
                        </div>
                      )}

                      {lg.remark && (
                        <div className="text-[11px] text-slate-600 italic bg-amber-50/50 border border-amber-100 p-2 rounded">
                          "{lg.remark}"
                        </div>
                      )}

                      {lg.reason && (
                        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded">
                          Reason: {lg.reason}
                        </div>
                      )}

                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Action performed by: <strong className="text-slate-700">{lg.by || "Admin"}</strong></span>
                        <span className="font-mono">#{idx + 1}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setLogClaim(null)}
                className="h-8 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
