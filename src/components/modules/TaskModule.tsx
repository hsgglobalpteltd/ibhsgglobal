"use client";

import * as React from "react";
import { Plus, History, X, UserCheck, Clock, Check, Edit2, ListTodo } from "lucide-react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { TagInput } from "./MerchandiserModule";
import { NavigationTabs } from "../navigation-tabs";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

const tabs = [
  { id: "pending", label: "Pending Task", desc: "Active tasks assigned to store locations and merchandiser field routes." },
  { id: "complete", label: "Completed Archives", desc: "Historical record of resolved, verified, and completed store tasks." }
];

export interface TaskLogEntry {
  action: "Visit" | "Call" | "Check Last Order" | string;
  remark: string;
  action_by: string;
  timestamp: number;
}

export interface TaskItem {
  created_date: number;
  stores_id: string;
  task_description: string;
  task_action: "Visit" | "Call" | "Check Last Order" | string;
  task_log: string; // JSON string of TaskLogEntry[]
  is_complete: "Pending" | "Done" | string;
  [key: string]: any;
}

interface TaskModuleProps {
  profile?: {
    role: string;
    name?: string;
    email?: string;
  } | null;
}

export function TaskModule({ profile }: TaskModuleProps) {
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"pending" | "complete">("pending");

  // Role permissions
  const isAdmin = profile?.role === "Administrator" || profile?.role === "Manager";
  const isOperator = profile?.role === "Operator" || profile?.role === "Operation";
  const canEdit = isAdmin || isOperator;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isUpdateLogOpen, setIsUpdateLogOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<TaskItem | null>(null);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);

  // Form states - Create / Edit Task
  const [selectedRetailerId, setSelectedRetailerId] = React.useState("");
  const [storeTags, setStoreTags] = React.useState<string[]>([]);
  const [newDescription, setNewDescription] = React.useState("");
  const [taskAction, setTaskAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");

  // Form states - Update Log
  const [newAction, setNewAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");
  const [newRemark, setNewRemark] = React.useState("");
  const [newActionBy, setNewActionBy] = React.useState("");
  const [nextAction, setNextAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");

  // Format date helper
  const formatDateTime = React.useCallback((timestamp: any): string => {
    if (!timestamp) return "—";
    const num = Number(timestamp);
    const date = isNaN(num) ? new Date(timestamp) : new Date(num);
    if (isNaN(date.getTime())) return "—";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }, []);

  // Fetch tasks from dedicated endpoint
  const fetchTasks = React.useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = (await res.json()) as TaskItem[];
      const list = Array.isArray(data) ? data : [];
      setTasks(list);
      localStorage.setItem("tasks_db_data", JSON.stringify(list));
      return list;
    } catch (err: any) {
      if (!silent) showToast("Failed to load tasks: " + err.message, "error");
      return [];
    } finally {
      if (!silent) setFetching(false);
    }
  }, []);

  // Fetch supporting stores & retailers
  const fetchSupportingData = React.useCallback(async () => {
    try {
      const [storesRes, retailersRes] = await Promise.all([
        fetch(`${API_BASE}/api/stores`),
        fetch(`${API_BASE}/api/retailers`)
      ]);
      if (storesRes.ok) {
        const sData = await storesRes.json();
        const sList = Array.isArray(sData) ? sData : [];
        setStores(sList);
        localStorage.setItem("stores_db_data", JSON.stringify(sList));
      }
      if (retailersRes.ok) {
        const rData = await retailersRes.json();
        const rList = Array.isArray(rData) ? rData : [];
        setRetailers(rList);
        localStorage.setItem("retailers_db_data", JSON.stringify(rList));
      }
    } catch (err) {
      console.warn("Could not load supporting stores/retailers", err);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    const cachedTasks = localStorage.getItem("tasks_db_data");
    const cachedStores = localStorage.getItem("stores_db_data");
    const cachedRetailers = localStorage.getItem("retailers_db_data");

    if (cachedTasks) {
      try { setTasks(JSON.parse(cachedTasks)); } catch (_) {}
    }
    if (cachedStores) {
      try { setStores(JSON.parse(cachedStores)); } catch (_) {}
    }
    if (cachedRetailers) {
      try { setRetailers(JSON.parse(cachedRetailers)); } catch (_) {}
    }

    fetchTasks(false);
    fetchSupportingData();
  }, [fetchTasks, fetchSupportingData]);

  // Global Refresh Listener
  React.useEffect(() => {
    const handleRefresh = async () => {
      await Promise.all([fetchTasks(true), fetchSupportingData()]);
    };
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, [fetchTasks, fetchSupportingData]);

  // Escape key to close history side panel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isHistoryOpen) {
        setIsHistoryOpen(false);
        setSelectedTask(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHistoryOpen]);

  // Action: Complete Task
  const handleCompleteTask = async (task: TaskItem) => {
    const previousTasks = [...tasks];
    const updatedRecord: TaskItem = {
      ...task,
      is_complete: "Done"
    };

    // Optimistic UI update
    const updatedList = tasks.map(t =>
      t.created_date === task.created_date ? updatedRecord : t
    );
    setTasks(updatedList);
    localStorage.setItem("tasks_db_data", JSON.stringify(updatedList));

    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          data: updatedRecord
        })
      });

      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update rejected");

      showToast("Task marked as completed!", "success");
    } catch (err: any) {
      showToast("Failed to complete task: " + err.message + ". Reverting...", "error");
      setTasks(previousTasks);
      localStorage.setItem("tasks_db_data", JSON.stringify(previousTasks));
    }
  };

  // Action: Create or Edit Task
  const handleCreateOrUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailerId) {
      showToast("Please select a retailer!", "warning");
      return;
    }
    if (storeTags.length === 0) {
      showToast("Please select at least one store!", "warning");
      return;
    }
    if (!newDescription.trim()) {
      showToast("Please enter a task description!", "warning");
      return;
    }

    const previousTasks = [...tasks];

    // Extract store IDs from tags (e.g. "Store Name (id: 339)" -> "339")
    const storeIds = storeTags.map(tag => {
      const match = tag.match(/\(id:\s*([^)]+)\)$/);
      return match ? match[1] : tag;
    });

    if (editingTask) {
      // Edit existing task
      const updatedRecord: TaskItem = {
        created_date: editingTask.created_date,
        stores_id: String(storeIds[0]),
        task_description: newDescription.trim(),
        task_action: taskAction,
        task_log: editingTask.task_log || "[]",
        is_complete: editingTask.is_complete || "Pending"
      };

      const updatedList = tasks.map(t =>
        t.created_date === editingTask.created_date ? updatedRecord : t
      );
      setTasks(updatedList);
      localStorage.setItem("tasks_db_data", JSON.stringify(updatedList));

      setIsCreateOpen(false);
      setEditingTask(null);
      setSelectedRetailerId("");
      setStoreTags([]);
      setNewDescription("");

      try {
        const res = await fetch(`${API_BASE}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            data: updatedRecord
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "Update rejected");

        showToast("Task updated successfully!", "success");
      } catch (err: any) {
        showToast("Failed to update task: " + err.message + ". Reverting...", "error");
        setTasks(previousTasks);
        localStorage.setItem("tasks_db_data", JSON.stringify(previousTasks));
      }
    } else {
      // Create new task(s)
      const baseTimestamp = Date.now();
      const newRecords: TaskItem[] = storeIds.map((storeId, idx) => ({
        created_date: baseTimestamp + idx,
        stores_id: storeId,
        task_description: newDescription.trim(),
        task_action: taskAction,
        task_log: "[]",
        is_complete: "Pending"
      }));

      const updatedList = [...newRecords, ...tasks];
      setTasks(updatedList);
      localStorage.setItem("tasks_db_data", JSON.stringify(updatedList));

      setIsCreateOpen(false);
      setSelectedRetailerId("");
      setStoreTags([]);
      setNewDescription("");

      try {
        const res = await fetch(`${API_BASE}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "batch_insert",
            data: newRecords
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "Insert rejected");

        showToast(`${newRecords.length} task(s) assigned successfully!`, "success");
      } catch (err: any) {
        showToast("Failed to assign task(s): " + err.message + ". Reverting...", "error");
        setTasks(previousTasks);
        localStorage.setItem("tasks_db_data", JSON.stringify(previousTasks));
      }
    }
  };

  // Action: Append Task Log
  const handleUpdateLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const previousTasks = [...tasks];

    // Parse existing logs safely
    let logList: TaskLogEntry[] = [];
    if (selectedTask.task_log && String(selectedTask.task_log).trim()) {
      try {
        const parsed = JSON.parse(selectedTask.task_log);
        if (Array.isArray(parsed)) {
          logList = parsed.map((item: any) => ({
            action: item.action || item.Action || "Visit",
            remark: item.remark || item.Remark || "",
            action_by: item.action_by || item["Action by"] || "System User",
            timestamp: Number(item.timestamp || item.Timestamp || Date.now())
          }));
        }
      } catch (_) {
        logList = [];
      }
    }

    const newLogEntry: TaskLogEntry = {
      action: newAction,
      remark: newRemark.trim(),
      action_by: newActionBy.trim() || profile?.name || profile?.email || "System User",
      timestamp: Date.now()
    };

    const updatedLogList = [...logList, newLogEntry];
    const updatedLogJson = JSON.stringify(updatedLogList);

    const updatedRecord: TaskItem = {
      ...selectedTask,
      task_action: nextAction,
      task_log: updatedLogJson
    };

    const updatedList = tasks.map(t =>
      t.created_date === selectedTask.created_date ? updatedRecord : t
    );
    setTasks(updatedList);
    localStorage.setItem("tasks_db_data", JSON.stringify(updatedList));

    setIsUpdateLogOpen(false);
    setSelectedTask(null);
    setNewRemark("");

    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          data: updatedRecord
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update rejected");

      showToast("Task action log recorded!", "success");
    } catch (err: any) {
      showToast("Failed to update task log: " + err.message + ". Reverting...", "error");
      setTasks(previousTasks);
      localStorage.setItem("tasks_db_data", JSON.stringify(previousTasks));
    }
  };

  // Filtered stores suggestions based on selected retailer ID
  const selectedRetailerStores = React.useMemo(() => {
    if (!selectedRetailerId) return [];
    return stores.filter(s => {
      const retId = s.retailers_id || s.retailer_id || s["Retailers ID"] || s["Retailer ID"];
      return String(retId).toLowerCase() === selectedRetailerId.toLowerCase();
    });
  }, [stores, selectedRetailerId]);

  const storeSuggestions = React.useMemo(() => {
    return selectedRetailerStores.map(s => `${s.display_name || s["Display Name"]} (id: ${s.id})`);
  }, [selectedRetailerStores]);

  // Tab mapping calculations
  const mappedTasks = React.useMemo(() => {
    const list = activeTab === "pending"
      ? tasks.filter(t => String(t.is_complete || "").toLowerCase() !== "done")
      : tasks.filter(t => String(t.is_complete || "").toLowerCase() === "done");

    // Sort descending by created_date
    const sorted = [...list].sort((a, b) => (Number(b.created_date) || 0) - (Number(a.created_date) || 0));

    return sorted.map((t) => {
      const store = stores.find(s => String(s.id) === String(t.stores_id));
      const storeName = store ? (store.display_name || store["Display Name"]) : `Store #${t.stores_id}`;

      let logs: TaskLogEntry[] = [];
      if (t.task_log && String(t.task_log).trim()) {
        try {
          const parsed = JSON.parse(t.task_log);
          if (Array.isArray(parsed)) {
            logs = parsed.map((item: any) => ({
              action: item.action || item.Action || "Visit",
              remark: item.remark || item.Remark || "",
              action_by: item.action_by || item["Action by"] || "System User",
              timestamp: Number(item.timestamp || item.Timestamp || 0)
            }));
          }
        } catch (_) {}
      }

      let latestActionNode = <span className="text-zinc-400 italic text-[11px]">No logs</span>;
      if (logs.length > 0) {
        const latest = logs[logs.length - 1];
        latestActionNode = (
          <div className="flex flex-col gap-0.5 text-xs text-zinc-700">
            <span className="font-semibold text-zinc-800">
              {latest.action} by <span className="underline decoration-slate-300">{latest.action_by || "System User"}</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {formatDateTime(latest.timestamp)}
            </span>
          </div>
        );
      }

      const logCellNode = (
        <div className="flex items-center gap-3">
          {latestActionNode}
          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedTask(t);
                setIsHistoryOpen(true);
              }}
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-zinc-600 font-mono text-[10px] cursor-pointer focus:outline-none flex items-center gap-1 transition-colors"
              title={`View Log History (${logs.length} entries)`}
            >
              <History size={11} className="stroke-[2.5]" />
              <span>{logs.length}</span>
            </button>
          )}
        </div>
      );

      const actionBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-tight bg-slate-100 text-zinc-700 border border-slate-200">
          {t.task_action || "Visit"}
        </span>
      );

      const isDone = String(t.is_complete || "").toLowerCase() === "done";
      const statusBadge = (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-tight border ${
          isDone
            ? "bg-slate-50 text-zinc-500 border-slate-200"
            : "bg-[#D3E3FD]/40 text-[#0B57D0] border-[#0B57D0]/20"
        }`}>
          {isDone ? "Completed" : "Pending"}
        </span>
      );

      const actionCellNode = (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSelectedTask(t);
              setNewAction("Visit");
              setNewRemark("");
              setNewActionBy(profile?.name || profile?.email || "");
              setNextAction(t.task_action as any || "Visit");
              setIsUpdateLogOpen(true);
            }}
            className="w-7 h-7 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white cursor-pointer focus:outline-none flex items-center justify-center shadow-xs transition-colors shrink-0"
            title="Update Log"
          >
            <Plus size={13} className="stroke-[2.5]" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingTask(t);
                setSelectedRetailerId("");
                const foundStore = stores.find(s => String(s.id) === String(t.stores_id));
                if (foundStore) {
                  const retId = foundStore.retailers_id || foundStore.retailer_id || foundStore["Retailers ID"] || foundStore["Retailer ID"];
                  setSelectedRetailerId(retId);
                  setStoreTags([`${foundStore.display_name || foundStore["Display Name"]} (id: ${foundStore.id})`]);
                } else {
                  setStoreTags([String(t.stores_id)]);
                }
                setNewDescription(t.task_description);
                setTaskAction(t.task_action as any || "Visit");
                setIsCreateOpen(true);
              }}
              className="w-7 h-7 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-zinc-700 cursor-pointer focus:outline-none flex items-center justify-center shadow-xs transition-colors shrink-0"
              title="Edit Task"
            >
              <Edit2 size={12} className="text-zinc-600" />
            </button>
          )}
          {canEdit && !isDone && (
            <button
              type="button"
              onClick={() => handleCompleteTask(t)}
              className="w-7 h-7 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-zinc-700 cursor-pointer focus:outline-none flex items-center justify-center shadow-xs transition-colors shrink-0"
              title="Mark as Completed"
            >
              <Check size={13} className="text-[#0B57D0] stroke-[2.5]" />
            </button>
          )}
        </div>
      );

      return {
        ...t,
        created_date_formatted: formatDateTime(t.created_date),
        store_name: storeName,
        task_action_badge: actionBadge,
        task_log_cell: logCellNode,
        status_badge: statusBadge,
        actions_cell: actionCellNode
      };
    });
  }, [tasks, stores, activeTab, profile, canEdit, formatDateTime]);

  const columns: Column[] = [
    { id: "created_date", header: "Created Date", accessor: "created_date_formatted" },
    { id: "store_name", header: "Store Name", accessor: "store_name" },
    { id: "task_action", header: "Task Action", accessor: "task_action_badge" },
    { id: "task_description", header: "Task Description", accessor: "task_description" },
    { id: "task_log", header: "Latest Log / History", accessor: "task_log_cell" },
    { id: "is_complete", header: "Status", accessor: "status_badge" },
    { id: "actions", header: "Actions", accessor: "actions_cell" }
  ];

  // Helper for rendering history list inside modal
  const selectedTaskLogs = React.useMemo(() => {
    if (!selectedTask) return [];
    let logList: TaskLogEntry[] = [];
    if (selectedTask.task_log && String(selectedTask.task_log).trim()) {
      try {
        const parsed = JSON.parse(selectedTask.task_log);
        if (Array.isArray(parsed)) {
          logList = parsed.map((item: any) => ({
            action: item.action || item.Action || "Visit",
            remark: item.remark || item.Remark || "",
            action_by: item.action_by || item["Action by"] || "System User",
            timestamp: Number(item.timestamp || item.Timestamp || 0)
          }));
        }
      } catch (_) {}
    }
    return [...logList].sort((a, b) => b.timestamp - a.timestamp); // latest first
  }, [selectedTask]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      
      {/* 1. TOP NAVIGATION TABS */}
      <NavigationTabs 
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId as any)}
      />

      {/* 2. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            {activeTab === "pending" ? "Pending Store Assigned Tasks" : "Completed Tasks Archive"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "pending" 
              ? "Track, dispatch, and append field action logs for assigned retail stores and merchandiser visits."
              : "Historical archive of resolved and verified retail task records."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <CustomButton
              variant="dark"
              onClick={() => {
                setIsCreateOpen(true);
                setSelectedRetailerId("");
                setStoreTags([]);
                setNewDescription("");
                setTaskAction("Visit");
                setEditingTask(null);
              }}
              className="flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>New Task</span>
            </CustomButton>
          )}
        </div>
      </div>

      {/* 3. DATA TABLE BODY */}
      <div className="flex-1 w-full overflow-hidden min-h-0">
        <DataTable
          columns={columns}
          data={mappedTasks}
          userRole="viewer"
          title={activeTab === "pending" ? "Pending Assigned Tasks" : "Completed Tasks Archives"}
          fetching={fetching}
          height="h-full"
        />
      </div>

      {/* MODAL: Assign / Edit Task Form */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateOrUpdateTask}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-bold text-base text-zinc-900">
                  {editingTask ? "Edit Store Task" : "Assign Store Task"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {editingTask ? "Update instructions and target store" : "Assign visit, call, or audit action to store locations"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingTask(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-700 transition-colors focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Select Retailer</label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => {
                    setSelectedRetailerId(e.target.value);
                    setStoreTags([]);
                  }}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] cursor-pointer transition-all"
                  required
                >
                  <option value="">-- Choose Retailer Group --</option>
                  {retailers.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.display_name || r["Display Name"] || r.id}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRetailerId && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-semibold text-zinc-600">
                    {editingTask ? "Target Store" : "Target Store(s)"}
                  </label>
                  <TagInput
                    tags={storeTags}
                    onChange={(tags) => {
                      if (editingTask && tags.length > 1) {
                        setStoreTags([tags[tags.length - 1]]);
                      } else {
                        setStoreTags(tags);
                      }
                    }}
                    placeholder={editingTask ? "Change store..." : "Search and select store(s)..."}
                    suggestions={storeSuggestions}
                    id="store_select_tags"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Task Action Required</label>
                <select
                  value={taskAction}
                  onChange={(e) => setTaskAction(e.target.value as any)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] cursor-pointer transition-all"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Task Instructions / Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="E.g., Call store manager for replenishment or visit to verify shelf stock levels."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] resize-none font-medium transition-all"
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2.5 bg-slate-50 border-t border-slate-200 px-6 py-3.5">
              <CustomButton
                type="button"
                variant="default"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingTask(null);
                }}
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                variant="dark"
              >
                {editingTask ? "Update Task" : "Deploy Task"}
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Update Task Action Log */}
      {isUpdateLogOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleUpdateLogSubmit}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-bold text-base text-zinc-900">Append Action Log</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Record visit, call, or stock verification outcome</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-700 transition-colors focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Target Store</span>
                <span className="text-xs font-bold text-zinc-900">
                  {stores.find(s => String(s.id) === String(selectedTask.stores_id))?.display_name || `Store #${selectedTask.stores_id}`}
                </span>
                <span className="text-xs text-zinc-600 italic mt-0.5">
                  &ldquo;{selectedTask.task_description}&rdquo;
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Action Performed</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value as any)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] cursor-pointer transition-all"
                    required
                  >
                    <option value="Visit">Visit</option>
                    <option value="Call">Call</option>
                    <option value="Check Last Order">Check Last Order</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Next Action Required</label>
                  <select
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value as any)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] cursor-pointer transition-all"
                    required
                  >
                    <option value="Visit">Visit</option>
                    <option value="Call">Call</option>
                    <option value="Check Last Order">Check Last Order</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Action Remark / Summary</label>
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="E.g., Call made to verify inventory. Order sheet has been submitted."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] resize-none font-medium transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Action Logged By</label>
                <input
                  type="text"
                  value={newActionBy}
                  onChange={(e) => setNewActionBy(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-semibold transition-all"
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 bg-slate-50 border-t border-slate-200 px-6 py-3.5">
              <CustomButton
                type="button"
                variant="default"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                variant="dark"
              >
                Log Action
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      {/* SIDEBAR: Log History Timeline View */}
      {isHistoryOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => {
              setIsHistoryOpen(false);
              setSelectedTask(null);
            }}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          />

          {/* Sidebar Panel */}
          <div 
            className="relative w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#0B57D0]" />
                <h3 className="font-bold text-sm text-zinc-900">Log History Timeline</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-700 transition-colors focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Task Info Context */}
            <div className="mx-6 my-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-zinc-700 flex-shrink-0 flex flex-col gap-1">
              <span className="font-bold text-zinc-900">
                Store: {stores.find(s => String(s.id) === String(selectedTask.stores_id))?.display_name || `Store #${selectedTask.stores_id}`}
              </span>
              <p className="text-zinc-600 italic mt-0.5">&ldquo;{selectedTask.task_description}&rdquo;</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">
                Assigned: {formatDateTime(selectedTask.created_date)}
              </span>
            </div>

            {/* Timeline scroll container */}
            <div className="flex-1 overflow-y-auto px-6 pr-4 pb-6 flex flex-col gap-4 relative pl-10">
              {/* Vertical line */}
              <div className="absolute left-[33px] top-2 bottom-6 w-0.5 bg-slate-200" />

              {selectedTaskLogs.length > 0 ? (
                selectedTaskLogs.map((log, idx) => {
                  return (
                    <div key={idx} className="relative flex gap-3 text-xs">
                      {/* Dot icon */}
                      <div className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] flex-shrink-0 shadow-xs bg-[#0B57D0] text-white">
                        {log.action.substring(0, 1).toUpperCase()}
                      </div>

                      {/* Details box */}
                      <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded-lg p-3 w-full shadow-xs hover:border-slate-300 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-zinc-900 uppercase tracking-wide text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-zinc-700 text-xs font-medium leading-relaxed mt-0.5">
                          {log.remark || "No remark logged"}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium border-t border-slate-100 pt-1.5 mt-1">
                          <UserCheck size={11} className="text-zinc-400" />
                          <span>Action by: <strong className="text-zinc-800">{log.action_by || "System User"}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-zinc-400 italic text-xs">
                  No log entries found.
                </div>
              )}
            </div>

            {/* Bottom Actions inside Sidebar */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0">
              <CustomButton
                type="button"
                variant="default"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                className="w-1/2"
              >
                Close
              </CustomButton>
              <CustomButton
                type="button"
                variant="dark"
                onClick={() => {
                  setNewAction("Visit");
                  setNewRemark("");
                  setNewActionBy(profile?.name || profile?.email || "");
                  setNextAction(selectedTask.task_action as any || "Visit");
                  setIsUpdateLogOpen(true);
                  setIsHistoryOpen(false);
                }}
                className="w-1/2"
              >
                Append Log
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

