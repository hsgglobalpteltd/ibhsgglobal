"use client";

import * as React from "react";
import { ListTodo, CheckCircle2, Clock, Plus, Settings2, History, X, Calendar, UserCheck } from "lucide-react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { TagInput } from "./MerchandiserModule";
import { NavigationTabs } from "../navigation-tabs";

const tabs = [
  { id: "pending", label: "Pending Task" },
  { id: "complete", label: "Complete" }
];

interface TaskModuleProps {
  profile?: {
    role: string;
    name?: string;
    email?: string;
  } | null;
}

export function TaskModule({ profile }: TaskModuleProps) {
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"pending" | "complete">("pending");

  // Role permissions
  const isAdmin = profile?.role === "Administrator";
  const isManager = profile?.role === "Manager";
  const isOperator = profile?.role === "Operator";

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isUpdateLogOpen, setIsUpdateLogOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);
  const [editingTask, setEditingTask] = React.useState<any | null>(null);

  // Form states - Create Task
  const [selectedRetailerId, setSelectedRetailerId] = React.useState("");
  const [storeTags, setStoreTags] = React.useState<string[]>([]);
  const [newDescription, setNewDescription] = React.useState("");
  const [taskAction, setTaskAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");

  // Form states - Update Log
  const [newAction, setNewAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");
  const [newRemark, setNewRemark] = React.useState("");
  const [newActionBy, setNewActionBy] = React.useState("");
  const [nextAction, setNextAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");

  // Parser helper to safely handle Unix Epoch and ISO date strings
  const parseTimestamp = React.useCallback((timestamp: any): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === "number") {
      if (timestamp >= 30000 && timestamp <= 60000) {
        return new Date(Math.round((timestamp - 25569) * 86400 * 1000));
      }
      return new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    }
    const str = String(timestamp ?? "").trim();
    if (!str) return new Date(NaN);

    if (/^\d+(\.\d+)?$/.test(str)) {
      const num = Number(str);
      if (num >= 30000 && num <= 60000) {
        return new Date(Math.round((num - 25569) * 86400 * 1000));
      }
      return new Date(num < 10000000000 ? num * 1000 : num);
    }

    const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
    if (matchSlash) {
      const day = Number(matchSlash[1]);
      const month = Number(matchSlash[2]) - 1;
      const year = Number(matchSlash[3]);
      const hours = matchSlash[4] ? Number(matchSlash[4]) : 0;
      const minutes = matchSlash[5] ? Number(matchSlash[5]) : 0;
      const seconds = matchSlash[6] ? Number(matchSlash[6]) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }

    const matchDash = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
    if (matchDash) {
      const year = Number(matchDash[1]);
      const month = Number(matchDash[2]) - 1;
      const day = Number(matchDash[3]);
      const hours = matchDash[4] ? Number(matchDash[4]) : 0;
      const minutes = matchDash[5] ? Number(matchDash[5]) : 0;
      const seconds = matchDash[6] ? Number(matchDash[6]) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }

    return new Date(str);
  }, []);

  const formatDateTime = React.useCallback((isoString: any): Date | string => {
    if (!isoString) return "";
    const date = parseTimestamp(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }, [parseTimestamp]);

  const fetchSheet = async (sheetName: string) => {
    const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.value || []);
    localStorage.setItem(`${sheetName}_data`, JSON.stringify(items));
    return items;
  };

  const fetchFreshData = async (sheetName: string, forceSync = false) => {
    try {
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, { method: "POST" });
      }
      return await fetchSheet(sheetName);
    } catch (e) {
      console.warn("Background fetch failed for " + sheetName, e);
      return [];
    }
  };

  // Load initial caching
  React.useEffect(() => {
    const cachedTasks = localStorage.getItem("Stores_Task_Assigned_data");
    const cachedStores = localStorage.getItem("Store_Retailer_DB_data");
    const cachedRetailers = localStorage.getItem("retailers_DB_data");

    if (cachedTasks) setTasks(JSON.parse(cachedTasks));
    if (cachedStores) setStores(JSON.parse(cachedStores));
    if (cachedRetailers) setRetailers(JSON.parse(cachedRetailers));

    setFetching(true);
    Promise.all([
      cachedTasks ? Promise.resolve(JSON.parse(cachedTasks)) : fetchSheet("Stores_Task_Assigned"),
      cachedStores ? Promise.resolve(JSON.parse(cachedStores)) : fetchSheet("Store_Retailer_DB"),
      cachedRetailers ? Promise.resolve(JSON.parse(cachedRetailers)) : fetchSheet("retailers_DB")
    ]).then(([t, s, r]) => {
      setTasks(t);
      setStores(s);
      setRetailers(r);
    }).catch((e) => {
      showToast("Error loading tasks database: " + e.message, "error");
    }).finally(() => {
      setFetching(false);
    });

    // Trigger silent background sync after mount
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("db-refresh"));
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Global Refresh Listener
  React.useEffect(() => {
    const handleRefresh = async () => {
      setFetching(true);
      try {
        await Promise.all([
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Stores_Task_Assigned`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Store_Retailer_DB`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=retailers_DB`, { method: "POST" })
        ]);
        const [t, s, r] = await Promise.all([
          fetchSheet("Stores_Task_Assigned"),
          fetchSheet("Store_Retailer_DB"),
          fetchSheet("retailers_DB")
        ]);
        setTasks(t);
        setStores(s);
        setRetailers(r);
      } catch (err: any) {
        showToast("Refresh failed: " + err.message, "error");
      } finally {
        setFetching(false);
      }
    };
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, []);

  // Listen for escape key to close history sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isHistoryOpen) {
        setIsHistoryOpen(false);
        setSelectedTask(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHistoryOpen]);

  // Actions
  const handleCompleteTask = async (task: any) => {
    const previousTasks = [...tasks];
    const cleanData = {
      "Created Date": Number(task["Created Date"]),
      "Stores ID": String(task["Stores ID"]),
      "Task Description": String(task["Task Description"]),
      "Task Action": String(task["Task Action"] || "Visit"),
      "Task Log": String(task["Task Log"] || ""),
      "is Complete": "Done"
    };

    // Optimistically update
    const updated = tasks.map(t =>
      Number(t["Created Date"]) === Number(task["Created Date"]) ? { ...t, "is Complete": "Done" } : t
    );
    setTasks(updated);
    localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

    showToast("Completing task in background...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Stores_Task_Assigned",
          action: "update",
          data: cleanData
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update rejected");

      showToast("Task marked as Done!", "success");
      fetchFreshData("Stores_Task_Assigned", false);
    } catch (err: any) {
      showToast("Failed to complete task: " + err.message + ". Reverting...", "error");
      setTasks(previousTasks);
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
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

    // Extract store IDs from tags (e.g. "Bibik Express - Store #1 (ID: 339)" -> "339")
    const storeIds = storeTags.map(tag => {
      const match = tag.match(/\(ID:\s*([^)]+)\)$/);
      return match ? match[1] : tag;
    });

    if (editingTask) {
      // Edit Mode: update the existing task
      const updatedTask = {
        "Created Date": Number(editingTask["Created Date"]),
        "Stores ID": String(storeIds[0]),
        "Task Description": newDescription.trim(),
        "Task Action": taskAction,
        "Task Log": String(editingTask["Task Log"] || ""),
        "is Complete": String(editingTask["is Complete"])
      };

      // Optimistic update
      const updated = tasks.map(t =>
        Number(t["Created Date"]) === Number(editingTask["Created Date"]) ? updatedTask : t
      );
      setTasks(updated);
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

      setIsCreateOpen(false);
      setEditingTask(null);
      setSelectedRetailerId("");
      setStoreTags([]);
      setNewDescription("");

      showToast("Updating task in background...", "info");

      try {
        const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "Stores_Task_Assigned",
            action: "update",
            data: updatedTask
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "Update rejected");

        showToast("Task updated successfully!", "success");
        fetchFreshData("Stores_Task_Assigned", false);
      } catch (err: any) {
        showToast("Failed to update task: " + err.message + ". Reverting...", "error");
        setTasks(previousTasks);
        localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
      }
    } else {
      // Creation Mode
      const baseCreatedDate = Date.now();
      const newTasks = storeIds.map((storeId, idx) => ({
        "Created Date": baseCreatedDate + idx,
        "Stores ID": storeId,
        "Task Description": newDescription.trim(),
        "Task Action": taskAction,
        "Task Log": "",
        "is Complete": "Pending"
      }));

      // Optimistic write
      const updated = [...tasks, ...newTasks];
      setTasks(updated);
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

      setIsCreateOpen(false);
      setSelectedRetailerId("");
      setStoreTags([]);
      setNewDescription("");

      showToast(`Deploying ${newTasks.length} task(s) in background...`, "info");

      try {
        await Promise.all(
          newTasks.map(async (task) => {
            const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sheet: "Stores_Task_Assigned",
                action: "insert",
                data: task
              })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status} for store ${task["Stores ID"]}`);
            const result = await res.json();
            if (!result.success) throw new Error(result.error || `GAS rejected store ${task["Stores ID"]}`);
          })
        );

        showToast("All tasks assigned and deployed successfully!", "success");
        fetchFreshData("Stores_Task_Assigned", false);
      } catch (err: any) {
        showToast("Failed to assign task(s): " + err.message + ". Reverting...", "error");
        setTasks(previousTasks);
        localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
      }
    }
  };

  const handleUpdateLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const previousTasks = [...tasks];

    // Parse existing logs
    let logList: any[] = [];
    if (selectedTask["Task Log"] && String(selectedTask["Task Log"]).trim()) {
      try {
        logList = JSON.parse(selectedTask["Task Log"]);
        if (!Array.isArray(logList)) logList = [];
      } catch (err) {
        logList = [];
      }
    }

    const newLogEntry = {
      Action: newAction,
      Remark: newRemark.trim(),
      "Action by": newActionBy.trim() || "System User",
      Timestamp: Date.now()
    };

    const updatedLogList = [...logList, newLogEntry];
    const updatedLogString = JSON.stringify(updatedLogList);

    const cleanData = {
      "Created Date": Number(selectedTask["Created Date"]),
      "Stores ID": String(selectedTask["Stores ID"]),
      "Task Description": String(selectedTask["Task Description"]),
      "Task Action": nextAction,
      "Task Log": updatedLogString,
      "is Complete": String(selectedTask["is Complete"])
    };

    // Optimistic update
    const updated = tasks.map(t =>
      Number(t["Created Date"]) === Number(selectedTask["Created Date"])
        ? { ...t, "Task Log": updatedLogString, "Task Action": nextAction }
        : t
    );
    setTasks(updated);
    localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

    setIsUpdateLogOpen(false);
    setSelectedTask(null);
    setNewRemark("");

    showToast("Saving log entry...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Stores_Task_Assigned",
          action: "update",
          data: cleanData
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update rejected");

      showToast("Task log updated successfully!", "success");
      fetchFreshData("Stores_Task_Assigned", false);
    } catch (err: any) {
      showToast("Failed to update task log: " + err.message + ". Reverting...", "error");
      setTasks(previousTasks);
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
    }
  };

  // Filtered stores suggestions based on selected retailer ID
  const selectedRetailerStores = React.useMemo(() => {
    if (!selectedRetailerId) return [];
    return stores.filter(s => {
      const retId = s["Retailers ID"] || s["Retailer ID"];
      return String(retId).toLowerCase() === selectedRetailerId.toLowerCase();
    });
  }, [stores, selectedRetailerId]);

  const storeSuggestions = React.useMemo(() => {
    return selectedRetailerStores.map(s => `${s["Display Name"]} (ID: ${s.ID})`);
  }, [selectedRetailerStores]);

  // Tab mapping calculations
  const mappedTasks = React.useMemo(() => {
    const list = activeTab === "pending"
      ? tasks.filter(t => String(t["is Complete"]).toLowerCase() !== "done")
      : tasks.filter(t => String(t["is Complete"]).toLowerCase() === "done");

    // Sort descending by Created Date
    list.sort((a, b) => {
      const timeA = parseTimestamp(a["Created Date"]).getTime();
      const timeB = parseTimestamp(b["Created Date"]).getTime();
      return timeB - timeA;
    });

    return list.map((t) => {
      const store = stores.find(s => String(s.ID) === String(t["Stores ID"]));
      const storeName = store ? store["Display Name"] : `Store #${t["Stores ID"]}`;

      let logs: any[] = [];
      if (t["Task Log"] && String(t["Task Log"]).trim()) {
        try {
          logs = JSON.parse(t["Task Log"]);
        } catch (e) {}
      }

      let latestActionNode = <span className="text-zinc-400 italic text-[11px]">No logs</span>;
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        latestActionNode = (
          <div className="flex flex-col gap-0.5 text-xs text-zinc-700">
            <span className="font-semibold text-zinc-800">
              {latest.Action} by <span className="underline decoration-zinc-400 decoration-1">{latest["Action by"] || "System User"}</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {String(formatDateTime(latest.Timestamp))}
            </span>
          </div>
        );
      }

      const logCellNode = (
        <div className="flex items-center gap-3">
          {latestActionNode}
          {Array.isArray(logs) && logs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedTask(t);
                setIsHistoryOpen(true);
              }}
              className="px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300 border border-zinc-300 text-zinc-700 font-extrabold text-[10px] cursor-pointer focus:outline-none flex items-center gap-1 transition-colors"
              title="View Complete Log History"
            >
              <History size={12} className="stroke-[2.5]" />
              <span>{logs.length} logs</span>
            </button>
          )}
        </div>
      );

      const actionBadge = (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
          String(t["Task Action"]).toLowerCase() === "check last order" ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
          String(t["Task Action"]).toLowerCase() === "call" ? "bg-amber-100 text-amber-700 border-amber-200" :
          "bg-emerald-100 text-emerald-700 border-emerald-200"
        }`}>
          {t["Task Action"] || "Visit"}
        </span>
      );

      const statusBadge = (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
          String(t["is Complete"]).toLowerCase() === "done"
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : "bg-amber-100 text-amber-700 border border-amber-200"
        }`}>
          {String(t["is Complete"]).toLowerCase() === "done" ? "Complete" : "Pending"}
        </span>
      );

      const actionCellNode = (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedTask(t);
              setNewAction("Visit");
              setNewRemark("");
              setNewActionBy(profile?.name || profile?.email || "");
              setNextAction(t["Task Action"] || "Visit");
              setIsUpdateLogOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-zinc-800 text-white hover:bg-zinc-950 font-extrabold text-[10px] cursor-pointer focus:outline-none flex items-center gap-1 shadow-2xs hover:shadow-xs transition-colors"
          >
            Update Log
          </button>
          {(isAdmin || isManager || isOperator) && (
            <button
              type="button"
              onClick={() => {
                setEditingTask(t);
                setSelectedRetailerId("");
                const store = stores.find(s => String(s.ID) === String(t["Stores ID"]));
                if (store) {
                  const retId = store["Retailers ID"] || store["Retailer ID"];
                  setSelectedRetailerId(retId);
                  setStoreTags([`${store["Display Name"]} (ID: ${store.ID})`]);
                } else {
                  setStoreTags([String(t["Stores ID"])]);
                }
                setNewDescription(t["Task Description"]);
                setTaskAction(t["Task Action"] || "Visit");
                setIsCreateOpen(true);
              }}
              className="px-2.5 py-1 rounded bg-zinc-600 hover:bg-zinc-700 text-white font-extrabold text-[10px] cursor-pointer focus:outline-none flex items-center gap-1 shadow-2xs hover:shadow-xs transition-colors"
            >
              Edit Task
            </button>
          )}
          {(isAdmin || isManager || isOperator) && String(t["is Complete"]).toLowerCase() !== "done" && (
            <button
              type="button"
              onClick={() => handleCompleteTask(t)}
              className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-[10px] cursor-pointer focus:outline-none flex items-center gap-1 shadow-2xs hover:shadow-xs transition-colors"
            >
              Complete
            </button>
          )}
        </div>
      );

      return {
        ...t,
        "Created Date": formatDateTime(t["Created Date"]),
        "Store Name": storeName,
        "Task Action": actionBadge,
        "Task Log": logCellNode,
        "is Complete": statusBadge,
        Actions: actionCellNode
      };
    });
  }, [tasks, stores, activeTab, profile, formatDateTime, parseTimestamp]);

  const columns: Column[] = [
    { id: "Created Date", header: "Created Date", accessor: "Created Date" },
    { id: "Store Name", header: "Store Name", accessor: "Store Name" },
    { id: "Task Action", header: "Task Action", accessor: "Task Action" },
    { id: "Task Description", header: "Task Description", accessor: "Task Description" },
    { id: "Task Log", header: "Latest Log / History", accessor: "Task Log" },
    { id: "is Complete", header: "Status", accessor: "is Complete" },
    { id: "Actions", header: "Actions", accessor: "Actions" }
  ];

  // Helper for rendering history list inside modal
  const selectedTaskLogs = React.useMemo(() => {
    if (!selectedTask) return [];
    let logList: any[] = [];
    if (selectedTask["Task Log"] && String(selectedTask["Task Log"]).trim()) {
      try {
        logList = JSON.parse(selectedTask["Task Log"]);
      } catch (e) {}
    }
    if (!Array.isArray(logList)) return [];
    return [...logList].sort((a, b) => b.Timestamp - a.Timestamp); // show latest first in timeline popup
  }, [selectedTask]);

  return (
    <div className="flex flex-col gap-4 font-primary h-full relative overflow-hidden min-w-0">
      <NavigationTabs 
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Tab Selector & Actions bar */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200 select-none shrink-0 px-1">
        <h2 className="text-base font-bold text-zinc-900">
          {activeTab === "pending" ? "Pending Assigned Tasks" : "Completed Tasks Archives"}
        </h2>
        {(isAdmin || isManager || isOperator) && (
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

      {/* Database list rendering */}
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden animate-tableFadeInOnly">
        <DataTable
          columns={columns}
          data={mappedTasks}
          userRole="viewer"
          title={activeTab === "pending" ? "Pending Assigned Tasks" : "Completed Tasks Archives"}
          fetching={fetching}
          height="h-full"
        />
      </div>

      {/* MODAL: Assign New Task */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-tableFadeInOnly">
          <form
            onSubmit={handleCreateTask}
            className="bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-lg max-w-md w-full p-6 animate-modalSlideUp flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-300 pb-2">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-zinc-700" />
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">
                  {editingTask ? "Edit Task Form" : "Assign Task Form"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingTask(null);
                }}
                className="p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Retailer</label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => {
                    setSelectedRetailerId(e.target.value);
                    setStoreTags([]); // Reset store tags when retailer shifts
                  }}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Retailer --</option>
                  {retailers.map(r => (
                    <option key={r.ID} value={r.ID}>
                      {r["Display Name"] || r.ID}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRetailerId && (
                <div className="flex flex-col gap-1.5 animate-tableFadeInOnly">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {editingTask ? "Target Store" : "Target Store(s)"}
                  </label>
                  <TagInput
                    tags={storeTags}
                    onChange={(tags) => {
                      // In edit mode, restrict to exactly one store tag
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Task Action</label>
                <select
                  value={taskAction}
                  onChange={(e) => setTaskAction(e.target.value as any)}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Task Instructions / Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="E.g., Call store manager for replenishment or visit to verify shelf stock levels."
                  rows={4}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none font-medium"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-300 pt-3 mt-1">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingTask(null);
                }}
                className="bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300 text-xs font-bold"
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

      {/* MODAL: Update Task Log */}
      {isUpdateLogOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-tableFadeInOnly">
          <form
            onSubmit={handleUpdateLogSubmit}
            className="bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-lg max-w-md w-full p-6 animate-modalSlideUp flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-300 pb-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-zinc-700" />
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">Append Action Log</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Target Store</span>
                <span className="text-xs font-extrabold text-zinc-800">
                  {stores.find(s => String(s.ID) === String(selectedTask["Stores ID"]))?.[ "Display Name" ] || `Store #${selectedTask["Stores ID"]}`}
                </span>
                <span className="text-[10px] text-zinc-500 italic mt-0.5">
                  &ldquo;{selectedTask["Task Description"]}&rdquo;
                </span>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-zinc-300/60 pt-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Perform Action</label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value as any)}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Next Action Required</label>
                <select
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value as any)}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action Remark</label>
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="E.g., Call made to verify inventory. Order sheet has been submitted."
                  rows={3}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action Logged By</label>
                <input
                  type="text"
                  value={newActionBy}
                  onChange={(e) => setNewActionBy(e.target.value)}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-300 pt-3 mt-1">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
                className="bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300 text-xs font-bold"
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
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes sidebarSlideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            @keyframes backdropFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-sidebarSlideIn {
              animation: sidebarSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-backdropFadeIn {
              animation: backdropFadeIn 0.25s ease-out forwards;
            }
          `}} />
          
          {/* Backdrop (blur black) */}
          <div 
            onClick={() => {
              setIsHistoryOpen(false);
              setSelectedTask(null);
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdropFadeIn"
          />

          {/* Sidebar Panel */}
          <div 
            className="relative w-full max-w-md h-full bg-[#EEEEEE] border-l border-zinc-300 shadow-2xl flex flex-col z-10 animate-sidebarSlideIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-300 p-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History size={16} className="text-zinc-700" />
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">Log History Timeline</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Task Info Context */}
            <div className="mx-6 my-4 flex flex-col gap-1 bg-zinc-200/50 border border-zinc-300/50 rounded p-3 text-xs text-zinc-700 flex-shrink-0">
              <span className="font-bold text-zinc-800">
                Store: {stores.find(s => String(s.ID) === String(selectedTask["Stores ID"]))?.[ "Display Name" ] || `Store #${selectedTask["Stores ID"]}`}
              </span>
              <p className="text-zinc-500 italic mt-0.5">&ldquo;{selectedTask["Task Description"]}&rdquo;</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">
                Assigned: {String(formatDateTime(selectedTask["Created Date"]))}
              </span>
            </div>

            {/* Timeline scroll container */}
            <div className="flex-1 overflow-y-auto px-6 pr-4 pb-6 flex flex-col gap-5 relative pl-10">
              {/* Vertical line offset to align with icon dot inside the timeline */}
              <div className="absolute left-[33px] top-2 bottom-6 w-0.5 bg-zinc-300" />

              {selectedTaskLogs.length > 0 ? (
                selectedTaskLogs.map((log, idx) => {
                  const actionColor =
                    log.Action === "Check Last Order" ? "bg-indigo-500 text-white border-indigo-600" :
                    log.Action === "Visit" ? "bg-emerald-500 text-white border-emerald-600" :
                    "bg-amber-500 text-white border-amber-600";

                  return (
                    <div key={idx} className="relative flex gap-4 text-xs">
                      {/* Timeline icon dot */}
                      <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center border font-black text-[8px] flex-shrink-0 shadow-2xs ${actionColor}`}>
                        {log.Action.substring(0, 1).toUpperCase()}
                      </div>

                      {/* Timeline details */}
                      <div className="flex flex-col gap-1 bg-[#E5E5E5]/40 border border-zinc-300/30 rounded-lg p-3 w-full shadow-2xs hover:bg-[#E5E5E5]/60 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-extrabold text-zinc-800 uppercase tracking-wide text-[10px]">
                            {log.Action}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {String(formatDateTime(log.Timestamp))}
                          </span>
                        </div>
                        <p className="text-zinc-600 text-xs italic font-medium leading-relaxed">
                          &ldquo;{log.Remark || "No remark logged"}&rdquo;
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold border-t border-zinc-300/20 pt-1.5 mt-1">
                          <UserCheck size={10} className="text-zinc-400" />
                          <span>Action by: <span className="text-zinc-700 underline decoration-zinc-400/80">{log["Action by"] || "System User"}</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-400 italic">
                  No log entries found.
                </div>
              )}
            </div>

            {/* Bottom Actions inside Sidebar */}
            <div className="border-t border-zinc-300 p-6 bg-zinc-100/50 flex items-center justify-between gap-3 flex-shrink-0">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                className="bg-zinc-200 border border-zinc-300 text-zinc-700 hover:bg-zinc-300 text-xs font-bold w-1/2 flex justify-center py-2 rounded"
              >
                Close
              </CustomButton>
              <CustomButton
                type="button"
                onClick={() => {
                  setNewAction("Visit");
                  setNewRemark("");
                  setNewActionBy(profile?.name || profile?.email || "");
                  setNextAction(selectedTask["Task Action"] || "Visit");
                  setIsUpdateLogOpen(true);
                  setIsHistoryOpen(false);
                }}
                className="bg-zinc-800 text-white hover:bg-zinc-950 text-xs font-bold w-1/2 flex justify-center py-2 rounded"
                variant="dark"
              >
                Update Task
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
