"use client";

import * as React from "react";
import { 
  Upload, Search, FileText, Printer, CheckCircle2, 
  AlertCircle, Clock, X, Loader2, ArrowLeft, ExternalLink, RefreshCw, Users
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";

interface TiktokFulfillmentModuleProps {
  profile?: {
    role: string;
    modules_access: string[];
    name?: string;
    email?: string;
  } | null;
  idToken?: string;
}

interface TiktokUser {
  id?: string;
  ID?: string;
  name?: string;
  Name?: string;
  pin?: string;
  PIN?: string;
  created_at?: number;
  Created_At?: number;
  "Created At"?: number;
}

interface TiktokOrder {
  id: string;
  tracking_number: string;
  buyer_name?: string;
  items?: string; // JSON string of products
  Items?: string;
  batch_id: string;
  upload_date: number;
  status: "Pending Pack" | "Packed" | "Picked Up" | "Issue";
  Status?: string;
  packed_by?: string;
  packed_at?: number;
  proof_photo?: string;
  handover_manifest_id?: string;
  handover_at?: number;
  issues?: string; // JSON string of issues array
  Issues?: string;
  logs?: string;   // JSON string of logs array
  Logs?: string;
  order_id?: string;
  Order_ID?: string;
  postcode?: string;
  Postcode?: string;
  address?: string;
  Address?: string;
  due_date?: number;
  Due_date?: number;
  "Due Date"?: number;
}

interface Issue {
  id: string;
  issue_type: string;
  description: string;
  pending_action: string;
  status: "pending" | "resolved";
  created_by: string;
  created_at: number;
  resolved_by?: string;
  resolved_at?: number;
  resolution_remark?: string;
}

interface LogEntry {
  action: string;
  actionBy: string;
  remark?: string;
  timestamp: number;
  photoUrl?: string;
}

const WORKER_URL = "https://ib.hsgglobalpteltd.workers.dev";

export function TiktokFulfillmentModule({ profile, idToken }: TiktokFulfillmentModuleProps) {
  const [orders, setOrders] = React.useState<TiktokOrder[]>([]);
  const isAdmin = profile?.role === "Administrator" || profile?.role === "Manager";
  const [fetching, setFetching] = React.useState(true);
  const [syncStatus, setSyncStatus] = React.useState<"idle" | "syncing" | "error">("idle");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  
  // UI Dialog States
  const [activeIssueOrder, setActiveIssueOrder] = React.useState<TiktokOrder | null>(null);
  const [issueType, setIssueType] = React.useState("Wrong pack");
  const [issueDesc, setIssueDesc] = React.useState("");
  const [issueAction, setIssueAction] = React.useState("");
  const [resolutionRemark, setResolutionRemark] = React.useState("");
  
  const [activeLogOrder, setActiveLogOrder] = React.useState<TiktokOrder | null>(null);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  
  // Handover Manifest Generator States
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<Set<string>>(new Set());
  const [showManifestModal, setShowManifestModal] = React.useState(false);
  const [courierName, setCourierName] = React.useState("");
  const [courierPlate, setCourierPlate] = React.useState("");
  const [isGeneratingManifest, setIsGeneratingManifest] = React.useState(false);

  // PDF Upload States
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Poll state tracker for Visibility-aware fetching
  const lastFetchTime = React.useRef<number>(0);

  // User Management registry modal states
  const [operatorRegistryOpen, setOperatorRegistryOpen] = React.useState(false);
  const [users, setUsers] = React.useState<TiktokUser[]>([]);
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<TiktokUser | null>(null);
  const [userName, setUserName] = React.useState("");
  const [userPin, setUserPin] = React.useState("");
  const [isSavingUser, setIsSavingUser] = React.useState(false);

  // Format date helper: DD/MM/YYYY
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    const date = new Date(Number(timestamp));
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date-time helper: DD/MM/YYYY HH:MM
  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return "-";
    const date = new Date(Number(timestamp));
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Format due date helper: Urgent if today or past due, DD/MM/YYYY otherwise
  const formatDueDate = (dueDateMs?: number | string) => {
    if (!dueDateMs) return "-";
    const numMs = Number(dueDateMs);
    if (isNaN(numMs) || numMs <= 0) return "-";
    
    const due = new Date(numMs);
    const now = new Date();
    
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (dueDay <= today) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-bold border border-red-200 uppercase tracking-wider animate-pulse">
          Urgent
        </span>
      );
    }
    
    const day = String(due.getDate()).padStart(2, "0");
    const month = String(due.getMonth() + 1).padStart(2, "0");
    const year = due.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fetch orders from Supabase Postgres
  const fetchOrders = async (forceSync = false) => {
    setFetching(true);
    if (forceSync) setSyncStatus("syncing");
    
    try {
      // Direct cache endpoint mapping to Supabase
      const res = await fetch(`${WORKER_URL}/api/admin/cache?sheet=tiktok_orders&t=${Date.now()}`);
      if (!res.ok) throw new Error("Database read failed.");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      lastFetchTime.current = Date.now();
      setSyncStatus("idle");
    } catch (err: any) {
      console.error("Failed to load TikTok orders:", err);
      showToast("Error pulling data: " + err.message, "error");
      setSyncStatus("error");
    } finally {
      setFetching(false);
    }
  };

  // Fetch users from Supabase Postgres
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/cache?sheet=tiktok_users&t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load operators.");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      showToast("Error pulling operators: " + err.message, "error");
    }
  };

  // Save Operator (Create or Update)
  const handleSaveUser = async () => {
    if (!userName.trim() || !userPin.trim()) {
      showToast("Please fill in both name and PIN fields.", "error");
      return;
    }
    
    if (!/^\d{4}$/.test(userPin.trim())) {
      showToast("PIN must be exactly 4 numeric digits.", "error");
      return;
    }
    
    setIsSavingUser(true);
    const userId = editingUser ? (editingUser.ID || editingUser.id) : `USR-${Date.now()}`;
    const action = editingUser ? "update" : "insert";
    
    const userData = {
      id: userId,
      name: userName.trim(),
      pin: userPin.trim(),
      created_at: editingUser ? (editingUser.Created_At || editingUser.created_at || Date.now()) : Date.now()
    };

    try {
      const res = await fetch(`${WORKER_URL}/api/admin/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Tiktok_Users",
          action: action,
          data: userData
        })
      });

      if (!res.ok) throw new Error("Failed to save operator details.");

      showToast(`Operator ${editingUser ? "updated" : "created"} successfully.`, "success");
      setUserModalOpen(false);
      setEditingUser(null);
      setUserName("");
      setUserPin("");
      fetchUsers();
    } catch (err: any) {
      showToast("Error saving operator: " + err.message, "error");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Delete Operator
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this operator?")) return;
    
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Tiktok_Users",
          action: "delete",
          data: { id: userId }
        })
      });

      if (!res.ok) throw new Error("Failed to delete operator.");

      showToast("Operator deleted successfully.", "success");
      fetchUsers();
    } catch (err: any) {
      showToast("Error deleting operator: " + err.message, "error");
    }
  };

  // Revoke Order to Pending Pack
  const handleRevokeOrder = async (order: TiktokOrder) => {
    if (!window.confirm(`Are you sure you want to revoke order ${order.id} and reset it to Pending Pack?`)) return;

    try {
      const orderLogs = parseLogs(order.Logs || order.logs);
      orderLogs.push({
        action: "Order Revoked",
        actionBy: profile?.name || "Operator",
        remark: "Status reset back to Pending Pack.",
        timestamp: Date.now()
      });

      const payload = {
        id: order.id,
        status: "Pending Pack",
        packed_by: null,
        packed_at: null,
        proof_photo: null,
        handover_manifest_id: null,
        handover_at: null,
        logs: JSON.stringify(orderLogs)
      };

      const res = await fetch(`${WORKER_URL}/api/admin/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Tiktok_Orders",
          action: "update",
          data: payload
        })
      });

      if (!res.ok) throw new Error("Revoke request failed.");

      showToast(`Order ${order.id} revoked successfully.`, "success");
      fetchOrders();
    } catch (err: any) {
      showToast("Failed to revoke order: " + err.message, "error");
    }
  };

  // 1. Initialize data fetching on mount
  React.useEffect(() => {
    fetchOrders();
    fetchUsers();
  }, []);

  // 2. Page Visibility-Aware Polling (refresh every 1 min when active)
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        console.log("Visibility polling: Fetching TikTok orders & users update...");
        fetchOrders();
        fetchUsers();
      }
    }, 60000); // 1 minute

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeSinceLastFetch = Date.now() - lastFetchTime.current;
        if (timeSinceLastFetch >= 60000) {
          console.log("Tab focused: Fetching immediate TikTok orders update...");
          fetchOrders();
          fetchUsers();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 3. Listen for global refresh trigger
  React.useEffect(() => {
    const handleDbRefresh = () => {
      console.log("Global refresh event received. Refreshing TikTok Fulfillment orders & users...");
      fetchOrders(true);
      fetchUsers();
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, []);

  // Parse items JSON safely
  const parseItems = (itemsStr: string): { sku: string; qty: number }[] => {
    try {
      const parsed = typeof itemsStr === "string" ? JSON.parse(itemsStr) : itemsStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Parse logs array safely
  const parseLogs = (logsStr?: string): LogEntry[] => {
    try {
      if (!logsStr) return [];
      const parsed = typeof logsStr === "string" ? JSON.parse(logsStr) : logsStr;
      return Array.isArray(parsed) ? parsed.sort((a, b) => b.timestamp - a.timestamp) : [];
    } catch {
      return [];
    }
  };

  // Parse issues array safely
  const parseIssues = (issuesStr?: string): Issue[] => {
    try {
      if (!issuesStr) return [];
      const parsed = typeof issuesStr === "string" ? JSON.parse(issuesStr) : issuesStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Check if an order has a pending issue active
  const hasActiveIssue = (order: TiktokOrder): boolean => {
    const parsed = parseIssues(order.Issues || order.issues);
    return parsed.some(i => i.status === "pending");
  };

  // Handle PDF packing labels upload & parsing via Gemini
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("Please upload a valid PDF document.", "error");
      return;
    }

    setUploading(true);
    showToast("Reading file and calling parser...", "info");

    try {
      // Encode file to base64
      const arrayBuffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      // Send to backend Gemini parser
      const parseRes = await fetch(`${WORKER_URL}/api/tiktok/parse-labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64Data, type: "application/pdf" })
      });

      if (!parseRes.ok) {
        const errorData = await parseRes.json();
        throw new Error(errorData.error || "Gemini parsing failed.");
      }

      const parseJson = await parseRes.json();
      const parsedOrders = parseJson.data || [];

      if (!Array.isArray(parsedOrders) || parsedOrders.length === 0) {
        throw new Error("No TikTok orders detected in the PDF shipping label.");
      }

      // Generate a single Batch ID for this upload
      const batchId = `BATCH-${Date.now()}`;
      showToast(`Extracted ${parsedOrders.length} orders. Syncing with database...`, "info");

      // Save orders to Supabase via bulk upsert
      const uploadOrdersPayload = parsedOrders.map((o: any) => {
        const trackingNum = String(o.id || o.tracking_number || o.tracking_code || o.Tracking_Number || "").trim();
        return {
          id: trackingNum, // The tracking detail is the ID to scan.
          tracking_number: trackingNum,
          order_id: String(o.order_id || o.Order_ID || "").trim(),
          postcode: String(o.postcode || o.Postcode || "").trim(),
          address: String(o.address || o.Address || "").trim(),
          due_date: Number(o.due_date || o.Due_date || o["Due Date"] || Date.now()),
          buyer_name: String(o.buyer_name || o.customer_name || "").trim() || "TikTok Customer",
          items: JSON.stringify(o.items || []),
          batch_id: batchId,
          upload_date: Date.now(),
          status: "Pending Pack",
          issues: "[]",
          logs: JSON.stringify([{
            action: "Batch Uploaded",
            actionBy: profile?.name || "Operator",
            remark: `Labels PDF uploaded. Batch ID: ${batchId}`,
            timestamp: Date.now()
          }])
        };
      });

      const writeRes = await fetch(`${WORKER_URL}/api/admin/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Tiktok_Orders",
          action: "upsert",
          data: uploadOrdersPayload
        })
      });

      if (!writeRes.ok) throw new Error("Failed to write orders into database.");

      showToast(`Batch ${batchId} imported successfully!`, "success");
      fetchOrders();
    } catch (err: any) {
      console.error("Fulfillment upload failed:", err);
      showToast(err.message || "Label processing failed.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Toggle order checkbox for manifest inclusion
  const toggleSelectOrder = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedOrderIds(next);
  };

  // Select all packed orders
  const toggleSelectAllPacked = (filteredPackedOrders: TiktokOrder[]) => {
    const allSelected = filteredPackedOrders.every(o => selectedOrderIds.has(o.id));
    const next = new Set(selectedOrderIds);
    if (allSelected) {
      filteredPackedOrders.forEach(o => next.delete(o.id));
    } else {
      filteredPackedOrders.forEach(o => next.add(o.id));
    }
    setSelectedOrderIds(next);
  };

  // Submit new issue details
  const submitLoggedIssue = async () => {
    if (!activeIssueOrder || !issueDesc.trim() || !issueAction.trim()) {
      showToast("Please fill in the description and pending action fields.", "error");
      return;
    }

    const orderId = activeIssueOrder.id;
    const operatorName = profile?.name || "Operator";
    
    const currentIssues = parseIssues(activeIssueOrder.Issues || activeIssueOrder.issues);
    const newIssue: Issue = {
      id: `iss_${Date.now()}`,
      issue_type: issueType,
      description: issueDesc,
      pending_action: issueAction,
      status: "pending",
      created_by: operatorName,
      created_at: Date.now()
    };
    currentIssues.push(newIssue);

    const currentLogs = parseLogs(activeIssueOrder.Logs || activeIssueOrder.logs);
    currentLogs.push({
      action: "Issue Logged",
      actionBy: operatorName,
      remark: `Logged: ${issueType}. Pending Action: ${issueAction}`,
      timestamp: Date.now()
    });

    try {
      const res = await fetch(`${WORKER_URL}/api/admin/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Tiktok_Orders",
          action: "update",
          data: {
            id: orderId,
            status: "Issue",
            issues: JSON.stringify(currentIssues),
            logs: JSON.stringify(currentLogs)
          }
        })
      });

      if (!res.ok) throw new Error("Sync failed.");

      showToast("Issue logged successfully.", "success");
      setActiveIssueOrder(null);
      setIssueDesc("");
      setIssueAction("");
      fetchOrders();
    } catch (err: any) {
      showToast("Failed to log issue: " + err.message, "error");
    }
  };

  // Mark pending issue as resolved
  const resolveLoggedIssue = async (issueId: string) => {
    if (!activeIssueOrder || !resolutionRemark.trim()) {
      showToast("Please fill in the resolution remark.", "error");
      return;
    }

    const orderId = activeIssueOrder.id;
    const operatorName = profile?.name || "Operator";
    
    // Resolve issue in issues array
    const currentIssues = parseIssues(activeIssueOrder.Issues || activeIssueOrder.issues).map(iss => {
      if (iss.id === issueId) {
        return {
          ...iss,
          status: "resolved" as const,
          resolved_by: operatorName,
          resolved_at: Date.now(),
          resolution_remark: resolutionRemark
        };
      }
      return iss;
    });

    // Check if any other issues are pending
    const hasRemainingPending = currentIssues.some(iss => iss.status === "pending");
    const newStatus = hasRemainingPending ? "Issue" : (activeIssueOrder.packed_by ? "Packed" : "Pending Pack");

    const currentLogs = parseLogs(activeIssueOrder.Logs || activeIssueOrder.logs);
    currentLogs.push({
      action: "Issue Resolved",
      actionBy: operatorName,
      remark: `Resolved: ${resolutionRemark}. Order status reverted to ${newStatus}.`,
      timestamp: Date.now()
    });

    try {
      const res = await fetch(`${WORKER_URL}/api/admin/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Tiktok_Orders",
          action: "update",
          data: {
            id: orderId,
            status: newStatus,
            issues: JSON.stringify(currentIssues),
            logs: JSON.stringify(currentLogs)
          }
        })
      });

      if (!res.ok) throw new Error("Sync failed.");

      showToast("Issue marked as resolved.", "success");
      setActiveIssueOrder(null);
      setResolutionRemark("");
      fetchOrders();
    } catch (err: any) {
      showToast("Failed to resolve issue: " + err.message, "error");
    }
  };

  // Compile selected orders and generate printable Courier Handover Manifest
  const triggerCourierHandover = async () => {
    if (selectedOrderIds.size === 0) return;
    
    // Find all selected orders
    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    
    // Safety check: All orders must be "Packed"
    const anyUnpacked = selectedOrders.some(o => o.status !== "Packed");
    if (anyUnpacked) {
      showToast("Only orders in 'Packed' status can be handed over to a courier.", "error");
      return;
    }

    setCourierName("");
    setCourierPlate("");
    setShowManifestModal(true);
  };

  const submitHandoverManifest = async () => {
    if (!courierName.trim()) {
      showToast("Please enter the courier / driver name.", "error");
      return;
    }

    setIsGeneratingManifest(true);
    const operatorName = profile?.name || "Operator";
    const manifestId = `MAN-${Date.now()}`;
    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));

    try {
      const updates = selectedOrders.map(order => {
        const orderLogs = parseLogs(order.logs);
        orderLogs.push({
          action: "Handover Manifest Generated",
          actionBy: operatorName,
          remark: `Handed over to courier ${courierName}. Manifest ID: ${manifestId}`,
          timestamp: Date.now()
        });

        return {
          id: order.id,
          status: "Picked Up",
          handover_manifest_id: manifestId,
          handover_at: Date.now(),
          logs: JSON.stringify(orderLogs)
        };
      });

      // Bulk write database update
      const res = await fetch(`${WORKER_URL}/api/admin/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Tiktok_Orders",
          action: "update",
          data: updates
        })
      });

      if (!res.ok) throw new Error("Manifest update transaction failed.");

      showToast(`Manifest ${manifestId} generated successfully. Starting print...`, "success");
      
      // Trigger window print logic
      setTimeout(() => {
        window.print();
        setShowManifestModal(false);
        setSelectedOrderIds(new Set());
        fetchOrders();
      }, 500);

    } catch (err: any) {
      showToast("Failed to finalize handover manifest: " + err.message, "error");
    } finally {
      setIsGeneratingManifest(false);
    }
  };

  // Group orders by Batch ID
  const groupedOrders = React.useMemo(() => {
    const groups: Record<string, { batch_id: string; upload_date: number; orders: TiktokOrder[] }> = {};
    
    // Sort and filter records
    const filtered = orders.filter(o => {
      const matchSearch = 
        String(o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(o.tracking_number).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(o.buyer_name).toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchSearch) return false;
      if (filterStatus === "all") return true;
      if (filterStatus === "Issue") return hasActiveIssue(o);
      return (o.Status || o.status) === filterStatus;
    });

    filtered.forEach(o => {
      if (!groups[o.batch_id]) {
        groups[o.batch_id] = {
          batch_id: o.batch_id,
          upload_date: o.upload_date,
          orders: []
        };
      }
      groups[o.batch_id].orders.push(o);
    });

    // Return sorted groups by upload date descending
    return Object.values(groups).sort((a, b) => b.upload_date - a.upload_date);
  }, [orders, searchQuery, filterStatus]);

  // Extract totals for summary cards
  const summaryTotals = React.useMemo(() => {
    let pendingPack = 0;
    let packed = 0;
    let issue = 0;
    let pickedUp = 0;

    orders.forEach(o => {
      if (hasActiveIssue(o)) {
        issue++;
      } else {
        const status = o.Status || o.status;
        if (status === "Pending Pack") {
          pendingPack++;
        } else if (status === "Packed") {
          packed++;
        } else if (status === "Picked Up") {
          pickedUp++;
        }
      }
    });

    return { pendingPack, packed, issue, pickedUp, total: orders.length };
  }, [orders]);

  const printableOrders = orders.filter(o => selectedOrderIds.has(o.id));

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] font-primary relative min-w-0 print:bg-white print:p-0">
      
      {/* =========================================================
           Screen View (Hidden during Print)
           ========================================================= */}
      <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0 print:hidden">
        
        {/* Header Search & Actions Row */}
        <div className="content-header flex flex-row items-center justify-between px-1 border-b border-zinc-300/40 pb-3 flex-shrink-0 gap-4">
          
          {/* Left: Search & Filter Dropdown */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input 
                type="text"
                placeholder="Search by Order ID, Tracking No, or Buyer Name..."
                value={searchQuery || ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 placeholder-zinc-400"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-pink-500 flex-shrink-0"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Pack">Pending Pack</option>
              <option value="Packed">Packed</option>
              <option value="Issue">Issue</option>
              <option value="Picked Up">Picked Up</option>
            </select>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {syncStatus === "syncing" && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400 animate-pulse mr-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />
                Syncing...
              </span>
            )}
            
            {selectedOrderIds.size > 0 && (
              <CustomButton
                variant="dark"
                onClick={triggerCourierHandover}
                className="h-9 text-xs gap-1.5 px-3 bg-pink-600 border-pink-600 hover:bg-pink-700 max-w-[200px]"
              >
                <Printer className="w-4 h-4" />
                Handover ({selectedOrderIds.size})
              </CustomButton>
            )}

            <CustomButton
              variant="default"
              onClick={() => setOperatorRegistryOpen(true)}
              className="h-9 text-xs gap-1.5 px-3 max-w-[200px] border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              <Users className="w-4 h-4" />
              Tiktok Pack Team
            </CustomButton>

            <CustomButton 
              variant="dark"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 gap-2 text-xs max-w-[200px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing PDF...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Packing PDF
                </>
              )}
            </CustomButton>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handlePdfUpload}
              accept="application/pdf"
              className="hidden"
            />
          </div>
        </div>

        {/* Summary KPI Cards Grid */}
        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Awaiting Pack</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-zinc-900">{summaryTotals.pendingPack}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-600 border border-amber-200">Pending</span>
            </div>
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ready / Packed</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-zinc-900">{summaryTotals.packed}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Done</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Issues</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-red-600">{summaryTotals.issue}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-600 border border-red-200">Attention</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Dispatched / Picked Up</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-zinc-950">{summaryTotals.pickedUp}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">Completed</span>
            </div>
          </div>
        </div>

        {/* Data List Scrollable Section */}
        <div className="content-body flex-1 overflow-y-auto border border-zinc-200 rounded-xl bg-white shadow-sm h-[calc(100vh-280px)] select-none">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-3 w-8">
                  {/* Select all checkbox for active filter visible rows */}
                  <input 
                    type="checkbox"
                    className="rounded text-pink-600 focus:ring-pink-500"
                    onChange={() => {
                      const allPacked = orders.filter(o => (o.Status || o.status) === "Packed" && 
                        (String(o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         String(o.tracking_number).toLowerCase().includes(searchQuery.toLowerCase()))
                      );
                      toggleSelectAllPacked(allPacked);
                    }}
                    checked={
                      orders.filter(o => (o.Status || o.status) === "Packed" && 
                        (String(o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         String(o.tracking_number).toLowerCase().includes(searchQuery.toLowerCase()))
                      ).length > 0 &&
                      orders.filter(o => (o.Status || o.status) === "Packed" && 
                        (String(o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         String(o.tracking_number).toLowerCase().includes(searchQuery.toLowerCase()))
                      ).every(o => selectedOrderIds.has(o.id))
                    }
                  />
                </th>
                <th className="py-2.5 px-3 font-semibold text-zinc-700">Tracking ID</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-700">Order Details (ID, Buyer, Address)</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-700">Due Date</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-700">Items list</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-700">Status</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-700">Log</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {fetching && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                    Fetching database records...
                  </td>
                </tr>
              ) : groupedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 italic">
                    No matching TikTok orders found in database.
                  </td>
                </tr>
              ) : (
                groupedOrders.map((group) => (
                  <React.Fragment key={group.batch_id}>
                    {/* Batch Separator Group Header */}
                    <tr className="bg-zinc-100 border-y border-zinc-200 font-bold text-zinc-600 select-none">
                      <td colSpan={8} className="py-2 px-3 font-semibold text-[11px] uppercase tracking-wider flex-row items-center gap-1.5">
                        📦 Batch ID: <span className="font-mono text-zinc-900 bg-white border border-zinc-200 rounded px-1.5 py-0.5 mr-2">{group.batch_id}</span>
                        • Imported: <span className="text-zinc-900">{formatDateTime(group.upload_date)}</span>
                        <span className="text-zinc-400 font-normal ml-2">({group.orders.length} items)</span>
                      </td>
                    </tr>
                    
                    {/* Orders lists */}
                    {group.orders.map((order, orderIdx) => {
                      const status = order.Status || order.status;
                      const isPacked = status === "Packed";
                      const isHandover = status === "Picked Up";
                      const hasActiveIssueOnRow = hasActiveIssue(order);
                      const isChecked = selectedOrderIds.has(order.id);

                      return (
                        <tr 
                          key={order.id || `order-${orderIdx}`} 
                          className={`hover:bg-zinc-50/50 transition-colors ${hasActiveIssueOnRow ? "bg-red-50/30 hover:bg-red-50/40" : ""}`}
                        >
                          <td className="py-3 px-3">
                            <input 
                              type="checkbox"
                              disabled={!isPacked || hasActiveIssueOnRow}
                              checked={isChecked}
                              onChange={() => toggleSelectOrder(order.id)}
                              className="rounded text-pink-600 focus:ring-pink-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-zinc-900 font-mono select-all text-xs">{order.id}</div>
                          </td>
                          <td className="py-3 px-3 max-w-[320px]">
                            <div className="flex flex-col gap-1 select-text">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Order ID:</span>
                                <span className="font-mono font-bold text-zinc-900 text-xs select-all">{order.order_id || order.Order_ID || "-"}</span>
                              </div>
                              <div className="text-[11px] text-zinc-700 font-semibold select-text">
                                Buyer: {order.buyer_name || "TikTok Customer"}
                              </div>
                              <div className="text-[11px] text-zinc-600 break-words leading-tight mt-0.5">
                                {order.postcode || order.Postcode ? (
                                  <span className="font-mono font-bold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 mr-1 text-[10px]">
                                    {order.postcode || order.Postcode}
                                  </span>
                                ) : null}
                                {order.address || order.Address || "-"}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {formatDueDate(order.due_date || order.Due_date || order["Due Date"])}
                          </td>
                          <td className="py-3 px-3 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {parseItems(order.items || "[]").map((item, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-700 font-medium border border-zinc-200"
                                >
                                  {item.sku} <span className="text-zinc-400 font-bold ml-1">x{item.qty}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {hasActiveIssueOnRow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-red-50 text-red-600 border border-red-200">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Issue
                              </span>
                            ) : status === "Pending Pack" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                <Clock className="w-3.5 h-3.5" />
                                Pending Pack
                              </span>
                            ) : isPacked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Packed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                                <FileText className="w-3.5 h-3.5" />
                                Picked Up
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isPacked && (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-zinc-800">{order.packed_by}</span>
                                <span className="text-[10px] text-zinc-500">{formatDateTime(order.packed_at)}</span>
                              </div>
                            )}
                            {isHandover && (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-zinc-800 font-mono text-[10px]">Manifest: {order.handover_manifest_id}</span>
                                <span className="text-[10px] text-zinc-500">{formatDateTime(order.handover_at)}</span>
                              </div>
                            )}
                            {!isPacked && !isHandover && <span className="text-zinc-400 italic">Not packed yet</span>}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Proof photo thumbnail trigger */}
                              {order.proof_photo && (
                                <button 
                                  onClick={() => setLightboxUrl(order.proof_photo || null)}
                                  className="w-7 h-7 rounded border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center overflow-hidden bg-zinc-100"
                                  title="View Proof Photo"
                                >
                                  <img 
                                    src={order.proof_photo} 
                                    alt="Proof Thumbnail" 
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              )}
                              
                              <button 
                                onClick={() => setActiveLogOrder(order)}
                                className="px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-semibold"
                                title="Order History Logs"
                              >
                                History
                              </button>

                              <button 
                                onClick={() => setActiveIssueOrder(order)}
                                className={`px-2 py-1 rounded border font-semibold ${
                                  hasActiveIssueOnRow 
                                    ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200" 
                                    : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                                }`}
                              >
                                {hasActiveIssueOnRow ? "Resolve Issue" : "Log Issue"}
                              </button>

                              {status !== "Pending Pack" && (
                                <button 
                                  onClick={() => handleRevokeOrder(order)}
                                  className="px-2 py-1 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold"
                                  title="Reset order status to Pending Pack"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
           Modal Overlay: Add / Resolve Issue Dialog
           ========================================================= */}
      {activeIssueOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-primary select-none print:hidden">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-bold text-zinc-950">
                  {hasActiveIssue(activeIssueOrder) ? "Resolve Order Issue" : "Report Order Issue"}
                </h3>
                <span className="text-xs text-zinc-500 font-mono">Order ID: {activeIssueOrder.id}</span>
              </div>
              <button 
                onClick={() => {
                  setActiveIssueOrder(null);
                  setIssueDesc("");
                  setIssueAction("");
                  setResolutionRemark("");
                }}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* RESOLVE ISSUE STATE */}
            {hasActiveIssue(activeIssueOrder) ? (
              <div className="flex flex-col gap-4">
                {parseIssues(activeIssueOrder.Issues || activeIssueOrder.issues).filter(i => i.status === "pending").map((iss) => (
                  <div key={iss.id} className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex flex-col gap-2">
                    <div>
                      <strong>Type:</strong> <span className="bg-red-100 px-1.5 py-0.5 rounded font-bold">{iss.issue_type}</span>
                    </div>
                    <div>
                      <strong>Description:</strong> {iss.description}
                    </div>
                    <div className="border-t border-red-200/50 pt-2 mt-1">
                      <strong>Required Action:</strong> <span className="underline font-semibold">{iss.pending_action}</span>
                    </div>
                    <div className="text-[10px] text-red-600/70 text-right mt-1">
                      Logged by {iss.created_by} on {formatDateTime(iss.created_at)}
                    </div>
                  </div>
                ))}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700">Resolution Remark</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe how the issue was resolved (e.g. repacked and scanned proof, cancellation processed)..."
                    value={resolutionRemark}
                    onChange={(e) => setResolutionRemark(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-pink-500 placeholder-zinc-400 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-200 pt-3">
                  <CustomButton
                    variant="default"
                    onClick={() => setActiveIssueOrder(null)}
                    className="h-9 px-4 text-xs font-bold max-w-[120px]"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    variant="dark"
                    onClick={() => {
                      const pendingIssue = parseIssues(activeIssueOrder.Issues || activeIssueOrder.issues).find(i => i.status === "pending");
                      if (pendingIssue) resolveLoggedIssue(pendingIssue.id);
                    }}
                    className="h-9 px-4 text-xs font-bold bg-pink-600 border-pink-600 hover:bg-pink-700 max-w-[150px]"
                  >
                    Resolve Issue
                  </CustomButton>
                </div>
              </div>
            ) : (
              /* LOG NEW ISSUE STATE */
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700">Issue Type</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-pink-500"
                  >
                    <option value="Cancel after Courier pick">Cancel after Courier pick</option>
                    <option value="Wrong pack">Wrong pack</option>
                    <option value="Damaged label / barcode">Damaged label / barcode</option>
                    <option value="Incorrect inventory count">Incorrect inventory count</option>
                    <option value="Buyer request change">Buyer request change</option>
                    <option value="Other/Misc">Other / Miscellaneous</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700">Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Detail what occurred..."
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-pink-500 placeholder-zinc-400 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700">Pending Action Required</label>
                  <input 
                    type="text"
                    placeholder="e.g. Awaiting return of package, repack correct items..."
                    value={issueAction}
                    onChange={(e) => setIssueAction(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-pink-500 placeholder-zinc-400"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-200 pt-3">
                  <CustomButton
                    variant="default"
                    onClick={() => setActiveIssueOrder(null)}
                    className="h-9 px-4 text-xs font-bold max-w-[120px]"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    variant="dark"
                    onClick={submitLoggedIssue}
                    className="h-9 px-4 text-xs font-bold bg-red-600 border-red-600 hover:bg-red-700 max-w-[150px]"
                  >
                    Log Issue
                  </CustomButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
           Modal Overlay: Log Timeline Dialog
           ========================================================= */}
      {activeLogOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-primary select-none print:hidden">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-bold text-zinc-950">Fulfillment Logs Timeline</h3>
                <span className="text-xs text-zinc-500 font-mono">Order ID: {activeLogOrder.id}</span>
              </div>
              <button 
                onClick={() => setActiveLogOrder(null)}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Timeline scroll container */}
            <div className="max-h-[350px] overflow-y-auto pr-1 flex flex-col gap-4">
              {parseLogs(activeLogOrder.Logs || activeLogOrder.logs).length === 0 ? (
                <span className="text-xs text-zinc-400 italic text-center py-6">No logs saved for this order.</span>
              ) : (
                <div className="relative border-l border-zinc-200 pl-4 ml-2 flex flex-col gap-5 py-2">
                  {parseLogs(activeLogOrder.Logs || activeLogOrder.logs).map((log, index) => (
                    <div key={index} className="relative text-xs">
                      {/* Marker dot */}
                      <span className="absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-pink-500 shadow-xs" />
                      
                      <div className="flex flex-col gap-0.5">
                        <div className="font-bold text-zinc-900 text-xs flex items-center justify-between">
                          {log.action}
                          <span className="text-[10px] text-zinc-400 font-normal">{formatDateTime(log.timestamp)}</span>
                        </div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">By: <span className="font-medium text-zinc-700">{log.actionBy}</span></div>
                        {log.remark && <div className="text-zinc-600 bg-zinc-50 border border-zinc-200/50 rounded-lg p-2 mt-1.5 select-all leading-normal">{log.remark}</div>}
                        
                        {log.photoUrl && (
                          <div className="mt-2">
                            <button 
                              onClick={() => setLightboxUrl(log.photoUrl || null)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-semibold"
                            >
                              <img src={log.photoUrl} className="w-5 h-5 rounded object-cover" />
                              View Proof Image
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-zinc-200 pt-3">
              <CustomButton
                variant="default"
                onClick={() => setActiveLogOrder(null)}
                className="h-9 px-4 text-xs font-bold max-w-[100px]"
              >
                Close
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
           Lightbox Image Proof Viewer Modal
           ========================================================= */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xs select-none print:hidden cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-lg max-h-[80vh] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
            <button 
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={lightboxUrl} 
              alt="Lightbox Proof Large View" 
              className="max-w-full max-h-[75vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* =========================================================
           Courier Handover Manifest Printable Modal
           ========================================================= */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-primary print:static print:bg-white print:p-0">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full">
            
            {/* Manifest Header Controls (Hidden in Print) */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 print:hidden">
              <h3 className="text-lg font-bold text-zinc-950">Generate Courier Handover manifest</h3>
              <button 
                onClick={() => setShowManifestModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Courier Info Forms (Hidden in Print) */}
            <div className="grid grid-cols-2 gap-4 border border-zinc-200 bg-zinc-50 rounded-xl p-4 print:hidden">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700">Courier / Driver Name</label>
                <input 
                  type="text"
                  placeholder="e.g. J&T Courier / Driver Name..."
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-pink-500 placeholder-zinc-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700">Vehicle Plate Number</label>
                <input 
                  type="text"
                  placeholder="e.g. GBC1234A..."
                  value={courierPlate}
                  onChange={(e) => setCourierPlate(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-pink-500 placeholder-zinc-400"
                />
              </div>
            </div>

            {/* Printable Manifest Document Sheet */}
            <div className="border border-zinc-300 rounded-xl p-6 bg-zinc-50 flex flex-col gap-4 select-text max-h-[380px] overflow-y-auto print:border-none print:bg-white print:p-0 print:max-h-none print:overflow-visible">
              
              {/* Document Header */}
              <div className="flex items-start justify-between border-b border-zinc-300 pb-4">
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">PARCEL HANDOVER MANIFEST</h1>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">TIKTOK SHOP PARCELS</span>
                </div>
                <div className="text-right flex flex-col gap-0.5 text-xs">
                  <div><strong>Manifest Date:</strong> {formatDate(Date.now())}</div>
                  <div><strong>Generated:</strong> {formatDateTime(Date.now())}</div>
                </div>
              </div>

              {/* Document Summary Info */}
              <div className="grid grid-cols-3 gap-6 bg-white border border-zinc-200 rounded-lg p-3 text-xs print:border-zinc-300">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Manifest Status</span>
                  <span className="font-bold text-pink-600">READY FOR DISPATCH</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Packages</span>
                  <span className="font-bold text-zinc-900">{printableOrders.length} Parcels</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Courier Dispatcher</span>
                  <span className="font-bold text-zinc-900">{courierName || "Awaiting Driver"} {courierPlate ? `(${courierPlate})` : ""}</span>
                </div>
              </div>

              {/* Packages List Table */}
              <table className="w-full border-collapse border border-zinc-300 text-[11px] text-left">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-800 font-bold">
                    <th className="py-2 px-3 border-r border-zinc-300 w-[4%]">#</th>
                    <th className="py-2 px-3 border-r border-zinc-300 w-[20%]">Tracking ID</th>
                    <th className="py-2 px-3 border-r border-zinc-300 w-[35%]">Order Details (ID, Buyer, Address)</th>
                    <th className="py-2 px-3 border-r border-zinc-300 w-[15%]">Due Date</th>
                    <th className="py-2 px-3 border-r border-zinc-300 w-[12%]">Status</th>
                    <th className="py-2 px-3 w-[14%]">Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300">
                  {printableOrders.map((ord, i) => {
                    const status = ord.Status || ord.status;
                    return (
                      <tr key={ord.id} className="border-b border-zinc-300 bg-white">
                        <td className="py-2 px-3 border-r border-zinc-300 text-center font-mono">{i + 1}</td>
                        <td className="py-2 px-3 border-r border-zinc-300 font-mono font-bold text-zinc-900">{ord.id}</td>
                        <td className="py-2 px-3 border-r border-zinc-300">
                          <div className="flex flex-col gap-0.5 select-text">
                            <div><strong>Order ID:</strong> <span className="font-mono font-semibold">{ord.order_id || ord.Order_ID || "-"}</span></div>
                            <div><strong>Buyer:</strong> {ord.buyer_name || "-"}</div>
                            <div className="text-[10px] text-zinc-500 leading-tight">
                              {ord.postcode || ord.Postcode ? (
                                <span className="font-mono font-bold bg-zinc-100 border border-zinc-200 rounded px-1 mr-1 text-[9px]">
                                  {ord.postcode || ord.Postcode}
                                </span>
                              ) : null}
                              {ord.address || ord.Address || "-"}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-zinc-300 text-center">
                          {formatDueDate(ord.due_date || ord.Due_date || ord["Due Date"])}
                        </td>
                        <td className="py-2 px-3 border-r border-zinc-300 font-bold text-zinc-800 text-center">
                          {status || "-"}
                        </td>
                        <td className="py-2 px-3">
                          {ord.packed_by ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-zinc-800">{ord.packed_by}</span>
                              <span className="text-[9px] text-zinc-400 font-mono">{formatDateTime(ord.packed_at)}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[10px]">Pending pack</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Printable Double Signatures Columns */}
              <div className="grid grid-cols-2 gap-10 mt-6 pt-6 border-t border-dashed border-zinc-300 print:mt-12">
                <div className="flex flex-col gap-12 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-zinc-800">Handed Over By:</span>
                    <span className="text-[10px] text-zinc-400">Warehouse Operator Signature</span>
                  </div>
                  <div className="border-b border-zinc-400 w-full" />
                  <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500">
                    <div>Operator Name: {profile?.name}</div>
                    <div>Date / Time: _______________________</div>
                  </div>
                </div>

                <div className="flex flex-col gap-12 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-zinc-800">Received By:</span>
                    <span className="text-[10px] text-zinc-400">Courier / Driver Signature</span>
                  </div>
                  <div className="border-b border-zinc-400 w-full" />
                  <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500">
                    <div>Courier Driver: {courierName || "_______________________"}</div>
                    <div>Date / Time: _______________________</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Manifest Footer Actions (Hidden in Print) */}
            <div className="flex justify-end gap-3 border-t border-zinc-200 pt-3 print:hidden">
              <CustomButton
                variant="default"
                onClick={() => setShowManifestModal(false)}
                className="h-9 px-4 text-xs font-bold max-w-[120px]"
              >
                Close
              </CustomButton>
              <CustomButton
                variant="dark"
                disabled={isGeneratingManifest}
                onClick={submitHandoverManifest}
                className="h-9 px-4 text-xs font-bold bg-pink-600 border-pink-600 hover:bg-pink-700 max-w-[180px]"
              >
                {isGeneratingManifest ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-1.5" />
                    Print Manifest
                  </>
                )}
              </CustomButton>
            </div>
            
          </div>
        </div>
      )}

      {/* =========================================================
           Modal Overlay: Tiktok Pack Team Registry (Popup)
           ========================================================= */}
      {operatorRegistryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-primary select-none print:hidden">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-bold text-zinc-950">Tiktok Pack Team Registry</h3>
                <span className="text-xs text-zinc-500 font-normal">Manage operator accounts for the TikTok scan mobile application.</span>
              </div>
              <button 
                onClick={() => {
                  setOperatorRegistryOpen(false);
                  setUserModalOpen(false);
                  setEditingUser(null);
                  setUserName("");
                  setUserPin("");
                }}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List / Table header actions inside modal */}
            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex-shrink-0">
              <span className="text-xs font-bold text-zinc-700">{users.length} Operators Registered</span>
              {isAdmin && !userModalOpen && (
                <CustomButton
                  variant="dark"
                  onClick={() => {
                    setEditingUser(null);
                    setUserName("");
                    setUserPin("");
                    setUserModalOpen(true);
                  }}
                  className="h-8 text-xs max-w-[130px]"
                >
                  Add Operator
                </CustomButton>
              )}
            </div>

            {/* NESTED ADD/EDIT FORM INLINE INSIDE REGISTRY MODAL */}
            {isAdmin && userModalOpen && (
              <div className="border border-zinc-200 bg-zinc-50 rounded-xl p-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  {editingUser ? "Edit Operator Details" : "Add New Operator"}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Operator Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Alex Tan..."
                      value={userName || ""}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-900 placeholder-zinc-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">4-Digit PIN</label>
                    <input 
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 1234..."
                      value={userPin || ""}
                      onChange={(e) => setUserPin(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-900 placeholder-zinc-400 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-1">
                  <CustomButton
                    variant="default"
                    onClick={() => {
                      setUserModalOpen(false);
                      setEditingUser(null);
                      setUserName("");
                      setUserPin("");
                    }}
                    className="h-8 px-3 text-xs max-w-[80px]"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    variant="dark"
                    disabled={isSavingUser}
                    onClick={handleSaveUser}
                    className="h-8 px-3 text-xs max-w-[120px]"
                  >
                    {isSavingUser ? "Saving..." : "Save Operator"}
                  </CustomButton>
                </div>
              </div>
            )}

            {/* Operators Table inside modal */}
            <div className="max-h-[250px] overflow-y-auto border border-zinc-200 rounded-xl bg-white select-text">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-2.5 px-3">Operator Name</th>
                    {isAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 2 : 1} className="py-8 text-center text-zinc-400 italic">
                        No operators registered.
                      </td>
                    </tr>
                  ) : (
                    users.map((u, idx) => (
                      <tr key={u.ID || u.id || `operator-${idx}`} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">{u.Name || u.name}</td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserName(u.Name || u.name || "");
                                  setUserPin(u.PIN || u.pin || "");
                                  setUserModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.ID || u.id || "")}
                                className="px-2.5 py-1 rounded border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-zinc-200 pt-3">
              <CustomButton
                variant="default"
                onClick={() => {
                  setOperatorRegistryOpen(false);
                  setUserModalOpen(false);
                  setEditingUser(null);
                  setUserName("");
                  setUserPin("");
                }}
                className="h-9 px-4 text-xs font-bold max-w-[100px]"
              >
                Close
              </CustomButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
