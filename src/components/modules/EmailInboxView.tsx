"use client";

import * as React from "react";
import { WORKER_URL } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "../confirm-dialog";
import {
  Search,
  RefreshCw,
  Trash2,
  Mail,
  MailOpen,
  MailCheck,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";

interface EmailItem {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body?: string;
  body_preview?: string;
  created_at: number;
}

const PAGE_SIZE = 10;
const READ_STORAGE_KEY = "ib_inbox_read_ids_v1";

function formatListDate(ts: number | string | undefined): string {
  if (!ts) return "";
  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(num)) return "";
  const d = new Date(num);
  const now = new Date();

  // If today, show time (e.g. 10:30 AM)
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  // Otherwise show date (e.g. 28 Oct)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatFullDate(ts: number | string | undefined): string {
  if (!ts) return "-";
  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(num)) return "-";
  const d = new Date(num);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function getSenderName(email: string): string {
  if (!email) return "Unknown";
  const part = email.split("@")[0] || email;
  return part.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EmailInboxView() {
  const [emails, setEmails] = React.useState<EmailItem[]>([]);
  const [selectedEmail, setSelectedEmail] = React.useState<EmailItem | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>("");
  const [inboundAddress, setInboundAddress] = React.useState<string>("paynow-alerts@hsgglobal.sg");

  // Read / Unread IDs state persisted in localStorage
  const [readIds, setReadIds] = React.useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set<string>();
  });

  // Filter: "all" | "unread"
  const [filterMode, setFilterMode] = React.useState<"all" | "unread">("all");

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Clear dialog state
  const [showClearConfirm, setShowClearConfirm] = React.useState<boolean>(false);
  const [isClearing, setIsClearing] = React.useState<boolean>(false);

  // Persist read IDs to localStorage
  const persistReadIds = (nextSet: Set<string>) => {
    setReadIds(nextSet);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(nextSet)));
    } catch {}
  };

  // Mark single email as read
  const markAsRead = React.useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  // Mark single email as unread
  const markAsUnread = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    showToast("Marked as unread", "info");
  };

  // Mark all emails as read
  const markAllAsRead = () => {
    const next = new Set(readIds);
    for (const item of emails) {
      next.add(item.id);
    }
    persistReadIds(next);
    showToast("All emails marked as read", "success");
  };

  // Fetch emails from backend
  const fetchInbox = React.useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/inbox/emails?_t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load inbox");
      const data = (await res.json()) as any;
      if (data.success && Array.isArray(data.emails)) {
        setEmails(data.emails);
        if (data.inbound_address) setInboundAddress(data.inbound_address);

        // Keep selected email or select the newest one
        if (data.emails.length > 0) {
          setSelectedEmail((prev) => {
            if (!prev) return data.emails[0];
            const found = data.emails.find((e: EmailItem) => e.id === prev.id);
            return found || data.emails[0];
          });
        } else {
          setSelectedEmail(null);
        }

        if (isManualRefresh) {
          showToast(`Inbox refreshed`, "success");
        }
      }
    } catch (err: any) {
      console.error("Inbox fetch error:", err);
      showToast(err.message || "Failed to load emails", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // When selectedEmail changes, automatically mark it as read
  React.useEffect(() => {
    if (selectedEmail?.id && !readIds.has(selectedEmail.id)) {
      markAsRead(selectedEmail.id);
    }
  }, [selectedEmail?.id, markAsRead, readIds]);

  // Clear Inbox handler
  const handleClearInbox = async () => {
    setIsClearing(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/inbox/emails/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to clear inbox");
      }
      setEmails([]);
      setSelectedEmail(null);
      persistReadIds(new Set());
      setShowClearConfirm(false);
      showToast("Inbox cleared", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to clear inbox", "error");
    } finally {
      setIsClearing(false);
    }
  };

  // Filtered emails based on search & unread filter
  const filteredEmails = React.useMemo(() => {
    return emails.filter((item) => {
      // Unread filter
      if (filterMode === "unread" && readIds.has(item.id)) {
        return false;
      }
      // Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.sender?.toLowerCase().includes(q) ||
        item.subject?.toLowerCase().includes(q) ||
        item.body?.toLowerCase().includes(q) ||
        item.body_preview?.toLowerCase().includes(q)
      );
    });
  }, [emails, filterMode, readIds, search]);

  // Total unread count
  const unreadCount = React.useMemo(() => {
    return emails.filter((e) => !readIds.has(e.id)).length;
  }, [emails, readIds]);

  // Pagination calculations
  const totalCount = filteredEmails.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Reset to page 1 if current page exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalCount);
  const pagedEmails = React.useMemo(() => {
    return filteredEmails.slice(startIndex, endIndex);
  }, [filteredEmails, startIndex, endIndex]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const isCurrentEmailRead = selectedEmail ? readIds.has(selectedEmail.id) : true;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs font-primary">
      {/* 1. TOP TOOLBAR: Clean Google Workspace Style */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-4">
        {/* Left: Title & Inbound Address (No "(2 emails)" here) */}
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-zinc-900 tracking-tight">Inbox</h2>
          <span className="text-xs text-zinc-600 font-mono bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {inboundAddress}
          </span>
        </div>

        {/* Right: Search Bar & Actions */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search in mail..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-md text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchInbox(true)}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-slate-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#0B57D0]" : ""} />
          </button>

          {/* Clear */}
          {emails.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="p-1.5 rounded-md hover:bg-rose-50 text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Clear all emails"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. SUB-BAR: Filter by Unread & Pagination */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-200 shrink-0 text-xs">
        {/* Left: Filter Controls */}
        <div className="flex items-center gap-2">
          {/* All Filter */}
          <button
            type="button"
            onClick={() => {
              setFilterMode("all");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              filterMode === "all"
                ? "bg-[#0B57D0] text-white shadow-2xs"
                : "bg-white border border-slate-200 text-zinc-600 hover:bg-slate-100"
            }`}
          >
            All
          </button>

          {/* Unread Filter */}
          <button
            type="button"
            onClick={() => {
              setFilterMode("unread");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterMode === "unread"
                ? "bg-[#0B57D0] text-white shadow-2xs"
                : "bg-white border border-slate-200 text-zinc-600 hover:bg-slate-100"
            }`}
          >
            {unreadCount > 0 && (
              <span
                className={`w-2 h-2 rounded-full ${
                  filterMode === "unread" ? "bg-white" : "bg-[#0B57D0]"
                }`}
              />
            )}
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterMode === "unread" ? "bg-white/20 text-white" : "bg-blue-50 text-[#0B57D0]"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Clear Filter button if unread is selected */}
          {filterMode === "unread" && (
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
                setCurrentPage(1);
              }}
              className="text-[11px] text-[#0B57D0] hover:underline font-semibold cursor-pointer ml-1"
            >
              Clear filter
            </button>
          )}

          {/* Mark all as read button */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 cursor-pointer ml-2 border-l border-slate-200 pl-3"
              title="Mark all emails as read"
            >
              <MailCheck size={13} className="text-zinc-400" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Right: Relocated Email Count & Pagination (Gmail style: "1–10 of 25  <  >") */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono">
            {totalCount > 0 ? (
              <>
                <strong className="text-zinc-800">{startIndex + 1}–{endIndex}</strong> of{" "}
                <strong className="text-zinc-800">{totalCount}</strong>
                {totalCount === 1 ? " email" : " emails"}
              </>
            ) : (
              "0 emails"
            )}
          </span>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-slate-200/70 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-200/70 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN 2-PANE GMAIL VIEW (EMAIL LIST + EMAIL READER) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANE: EMAIL LIST */}
        <div className="w-[360px] md:w-[420px] shrink-0 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
          {pagedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 p-6 text-center text-zinc-400">
              <Mail size={36} className="text-zinc-300 mb-2" />
              <p className="text-xs font-semibold text-zinc-700">
                {filterMode === "unread" ? "No unread emails" : "No emails found"}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[220px]">
                {filterMode === "unread" ? (
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className="text-[#0B57D0] hover:underline font-semibold"
                  >
                    View all emails
                  </button>
                ) : (
                  `Emails sent to ${inboundAddress} will arrive here.`
                )}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {pagedEmails.map((item) => {
                const isSelected = selectedEmail?.id === item.id;
                const isUnread = !readIds.has(item.id);
                const snippet = item.body || item.body_preview || item.subject || "";

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedEmail(item);
                      markAsRead(item.id);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors border-l-4 flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-[#E8F0FE]/70 border-l-[#0B57D0]"
                        : isUnread
                        ? "bg-white hover:bg-slate-50 border-l-transparent font-medium"
                        : "bg-slate-50/30 hover:bg-slate-50 border-l-transparent text-zinc-500"
                    }`}
                  >
                    {/* Unread Blue Dot Indicator */}
                    <div className="pt-1 shrink-0">
                      {isUnread ? (
                        <span
                          className="w-2 h-2 rounded-full bg-[#0B57D0] block shadow-xs"
                          title="Unread"
                        />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-transparent block" />
                      )}
                    </div>

                    {/* Email Content Details */}
                    <div className="flex-1 min-w-0">
                      {/* Sender & Date */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            isUnread ? "font-bold text-zinc-950" : "font-medium text-zinc-700"
                          }`}
                        >
                          {getSenderName(item.sender)}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                          {formatListDate(item.created_at)}
                        </span>
                      </div>

                      {/* Subject */}
                      <div
                        className={`text-xs truncate mb-1 ${
                          isUnread ? "font-bold text-zinc-900" : "font-normal text-zinc-600"
                        }`}
                      >
                        {item.subject || "(No Subject)"}
                      </div>

                      {/* Snippet Preview */}
                      <p className="text-[11px] text-zinc-500 line-clamp-1 font-normal leading-relaxed">
                        {snippet}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT PANE: EMAIL READING PANE (FULL HEIGHT) */}
        <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
          {selectedEmail ? (
            <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
              {/* Reader Sub-Toolbar: Actions (Mark unread, etc.) */}
              <div className="px-6 py-2 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCurrentEmailRead) {
                        markAsUnread(selectedEmail.id);
                      } else {
                        markAsRead(selectedEmail.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded hover:bg-slate-100 text-xs text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={isCurrentEmailRead ? "Mark as unread" : "Mark as read"}
                  >
                    {isCurrentEmailRead ? <Mail size={13} /> : <MailOpen size={13} />}
                    <span>{isCurrentEmailRead ? "Mark as unread" : "Mark as read"}</span>
                  </button>
                </div>
              </div>

              {/* Reader Header & Body Container (Full Height Stretching) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col max-w-4xl w-full">
                {/* Subject Title */}
                <h1 className="text-xl font-bold text-zinc-950 mb-5 leading-tight tracking-tight">
                  {selectedEmail.subject || "(No Subject)"}
                </h1>

                {/* Sender & Recipient Header */}
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-3.5">
                    {/* Sender Avatar Circle */}
                    <div className="w-10 h-10 rounded-full bg-[#0B57D0] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {selectedEmail.sender ? selectedEmail.sender.charAt(0).toUpperCase() : "M"}
                    </div>

                    {/* Sender Info */}
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-zinc-900">
                          {getSenderName(selectedEmail.sender)}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          &lt;{selectedEmail.sender}&gt;
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        to{" "}
                        <span className="text-zinc-700 font-medium">
                          {selectedEmail.recipient || inboundAddress}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Received Time */}
                  <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0">
                    {formatFullDate(selectedEmail.created_at)}
                  </span>
                </div>

                {/* PURE EMAIL BODY */}
                <div className="py-6 font-sans text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap select-text">
                  {selectedEmail.body ||
                    selectedEmail.body_preview ||
                    "This email has no text content."}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-zinc-400">
              <Mail size={44} className="text-zinc-200 mb-3" />
              <p className="text-sm font-medium text-zinc-600">No email selected</p>
              <p className="text-xs text-zinc-400 mt-1">
                Select an email from the inbox list to read its contents.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Clear Inbox */}
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear all emails?"
        description="Are you sure you want to delete all emails from this inbox? This cannot be undone."
        confirmText="Clear Inbox"
        variant="danger"
        onConfirm={handleClearInbox}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
