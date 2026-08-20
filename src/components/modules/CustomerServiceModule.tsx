"use client";

import * as React from "react";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  Sliders, 
  Clock, 
  Check, 
  X,
  AlertCircle
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "@/components/custom-button";

const BACKEND_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface CsContextItem {
  id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: number;
  updated_at: number;
}

interface CsMessage {
  id: string;
  sender: "visitor" | "agent";
  text: string;
  timestamp: number;
}

interface CsConversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_contact?: string;
  messages: CsMessage[];
  status: string;
  created_at: number;
  updated_at: number;
}

const CATEGORY_OPTIONS = [
  "Company Profile",
  "Order & Delivery Policy",
  "Payment & Credit Terms",
  "Brand Portfolio",
  "Contact & Escalation",
  "Product Guidance",
  "General FAQ"
];

function Modal({
  isOpen,
  onClose,
  title,
  maxWidth = "max-w-xl",
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-lg border border-zinc-200 shadow-xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50/50">
          <h3 className="font-primary text-sm font-bold text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export function CustomerServiceModule({ profile }: { profile?: any }) {
  const [activeTab, setActiveTab] = React.useState<"context" | "logs" | "simulator">("context");

  // Context State
  const [contexts, setContexts] = React.useState<CsContextItem[]>([]);
  const [contextLoading, setContextLoading] = React.useState(false);
  const [contextSearch, setContextSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");

  // Context Modal State
  const [isContextModalOpen, setIsContextModalOpen] = React.useState(false);
  const [editingContext, setEditingContext] = React.useState<CsContextItem | null>(null);
  const [contextForm, setContextForm] = React.useState({
    id: "",
    category: "Company Profile",
    title: "",
    content: "",
    is_active: true,
    priority: 1
  });
  const [contextSaving, setContextSaving] = React.useState(false);

  // Delete Context Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingContextId, setDeletingContextId] = React.useState<string | null>(null);

  // Conversations State
  const [conversations, setConversations] = React.useState<CsConversation[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(false);
  const [logsSearch, setLogsSearch] = React.useState("");
  const [selectedConversation, setSelectedConversation] = React.useState<CsConversation | null>(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = React.useState(false);

  // Simulator State
  const [simulatorMessages, setSimulatorMessages] = React.useState<CsMessage[]>([
    {
      id: "sim_init",
      sender: "agent",
      text: "Hello! I am your HSG Global customer support concierge. How may I assist you today?",
      timestamp: Date.now()
    }
  ]);
  const [simulatorInput, setSimulatorInput] = React.useState("");
  const [simulatorLoading, setSimulatorLoading] = React.useState(false);
  const simulatorEndRef = React.useRef<HTMLDivElement>(null);

  // 1. Fetch Knowledge Contexts
  const fetchContexts = async () => {
    setContextLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cs/context`);
      const data = (await res.json()) as any;
      if (data && data.success && Array.isArray(data.data)) {
        setContexts(data.data);
      } else {
        setContexts([]);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load knowledge context", "error");
    } finally {
      setContextLoading(false);
    }
  };

  // 2. Fetch Conversation Logs
  const fetchConversations = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cs/conversations`);
      const data = (await res.json()) as any;
      if (data && data.success && Array.isArray(data.data)) {
        const parsed = data.data.map((c: any) => ({
          ...c,
          messages: Array.isArray(c.messages) ? c.messages : typeof c.messages === "string" ? JSON.parse(c.messages) : []
        }));
        setConversations(parsed);
      } else {
        setConversations([]);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load conversation logs", "error");
    } finally {
      setLogsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchContexts();
    fetchConversations();
  }, []);

  React.useEffect(() => {
    const handleRefresh = () => {
      fetchContexts();
      fetchConversations();
    };
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, []);

  // Handle Save Context
  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextForm.title.trim() || !contextForm.content.trim()) {
      showToast("Title and Content are required", "error");
      return;
    }

    setContextSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cs/context/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: contextForm })
      });
      const data = (await res.json()) as any;
      if (data && data.success) {
        showToast("Knowledge context saved successfully", "success");
        setIsContextModalOpen(false);
        setEditingContext(null);
        fetchContexts();
      } else {
        throw new Error(data?.error || "Failed to save context");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save context", "error");
    } finally {
      setContextSaving(false);
    }
  };

  // Handle Delete Context
  const handleDeleteContextConfirm = async () => {
    if (!deletingContextId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/cs/context/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingContextId })
      });
      const data = (await res.json()) as any;
      if (data && data.success) {
        showToast("Knowledge context entry deleted", "info");
        setDeleteConfirmOpen(false);
        setDeletingContextId(null);
        fetchContexts();
      } else {
        throw new Error(data?.error || "Failed to delete context");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete context", "error");
    }
  };

  // Toggle Context Active State
  const handleToggleActive = async (item: CsContextItem) => {
    const updated = { ...item, is_active: !item.is_active };
    try {
      const res = await fetch(`${BACKEND_URL}/api/cs/context/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updated })
      });
      const data = (await res.json()) as any;
      if (data && data.success) {
        showToast(`Context ${updated.is_active ? "activated" : "deactivated"}`, "success");
        setContexts(prev => prev.map(c => c.id === item.id ? updated : c));
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update state", "error");
    }
  };

  // Handle Simulator Send
  const handleSimulatorSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorInput.trim() || simulatorLoading) return;

    const userText = simulatorInput.trim();
    const userMsg: CsMessage = {
      id: "sim_u_" + Date.now(),
      sender: "visitor",
      text: userText,
      timestamp: Date.now()
    };

    const newHistory = [...simulatorMessages, userMsg];
    setSimulatorMessages(newHistory);
    setSimulatorInput("");
    setSimulatorLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/cs/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          session_id: "admin_simulator_session",
          conversation_id: "SIMULATOR-TEST",
          visitor_name: "Admin Simulator",
          history: newHistory
        })
      });
      const data = (await res.json()) as any;
      if (data && data.success && data.reply) {
        const agentMsg: CsMessage = {
          id: "sim_a_" + Date.now(),
          sender: "agent",
          text: data.reply,
          timestamp: Date.now()
        };
        setSimulatorMessages(prev => [...prev, agentMsg]);
      } else {
        throw new Error(data?.error || "No reply returned");
      }
    } catch (err: any) {
      const errorMsg: CsMessage = {
        id: "sim_err_" + Date.now(),
        sender: "agent",
        text: "Error: Unable to generate response. Please verify context and API settings.",
        timestamp: Date.now()
      };
      setSimulatorMessages(prev => [...prev, errorMsg]);
    } finally {
      setSimulatorLoading(false);
      setTimeout(() => {
        simulatorEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Filtered Contexts
  const filteredContexts = React.useMemo(() => {
    return contexts.filter(c => {
      const matchesCat = selectedCategory === "all" || c.category === selectedCategory;
      const matchesSearch = !contextSearch.trim() || 
        c.title.toLowerCase().includes(contextSearch.toLowerCase()) ||
        c.content.toLowerCase().includes(contextSearch.toLowerCase()) ||
        c.category.toLowerCase().includes(contextSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [contexts, selectedCategory, contextSearch]);

  // Filtered Conversations
  const filteredConversations = React.useMemo(() => {
    return conversations.filter(c => {
      if (!logsSearch.trim()) return true;
      const s = logsSearch.toLowerCase();
      const matchId = c.id.toLowerCase().includes(s);
      const matchSession = c.session_id?.toLowerCase().includes(s);
      const matchName = c.visitor_name?.toLowerCase().includes(s);
      const matchContact = c.visitor_contact?.toLowerCase().includes(s);
      const matchText = c.messages?.some(m => m.text?.toLowerCase().includes(s));
      return matchId || matchSession || matchName || matchContact || matchText;
    });
  }, [conversations, logsSearch]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px]">
      {/* Top Header & Tab Navigation */}
      <div className="content-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-zinc-300/40 pb-3">
        <div className="flex flex-col">
          <h2 className="font-primary text-xl font-bold text-zinc-950 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0B57D0]" />
            Customer Service & Chat Concierge
          </h2>
          <p className="font-primary text-xs text-zinc-500">
            Manage company knowledge context, review visitor conversation logs, and test the concierge assistant.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("context")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "context" 
                ? "bg-white text-[#0B57D0] shadow-xs border border-zinc-200/80" 
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Knowledge Context ({contexts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "logs" 
                ? "bg-white text-[#0B57D0] shadow-xs border border-zinc-200/80" 
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Conversation Logs ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "simulator" 
                ? "bg-white text-[#0B57D0] shadow-xs border border-zinc-200/80" 
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Test Simulator
          </button>
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      <div className="content-body flex-1 w-full overflow-hidden flex flex-col">
        
        {/* TAB 1: KNOWLEDGE CONTEXT MANAGEMENT */}
        {activeTab === "context" && (
          <div className="flex flex-col flex-1 h-full overflow-hidden gap-3">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1">
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search knowledge context by title, content or category..."
                    value={contextSearch}
                    onChange={(e) => setContextSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#0B57D0]"
                >
                  <option value="all">All Categories</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <CustomButton
                  variant="secondary"
                  onClick={fetchContexts}
                  disabled={contextLoading}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${contextLoading ? "animate-spin" : ""}`} />
                  Refresh
                </CustomButton>
                <CustomButton
                  variant="dark"
                  onClick={() => {
                    setEditingContext(null);
                    setContextForm({
                      id: "",
                      category: "Company Profile",
                      title: "",
                      content: "",
                      is_active: true,
                      priority: contexts.length + 1
                    });
                    setIsContextModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Context
                </CustomButton>
              </div>
            </div>

            {/* Contexts Custom Table */}
            <div className="flex-1 w-full overflow-auto bg-white border border-slate-200 rounded-lg shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-zinc-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-3.5 py-2.5 w-[70px]">Rank</th>
                    <th className="px-3.5 py-2.5 w-[160px]">Category</th>
                    <th className="px-3.5 py-2.5 w-[220px]">Title & Knowledge Focus</th>
                    <th className="px-3.5 py-2.5">Context Knowledge Preview</th>
                    <th className="px-3.5 py-2.5 w-[100px]">Status</th>
                    <th className="px-3.5 py-2.5 w-[100px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-primary">
                  {contextLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                          <span>Loading knowledge context...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredContexts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                        No knowledge context entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredContexts.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded text-zinc-700">
                            #{row.priority || 1}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md whitespace-nowrap">
                            {row.category}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-900">{row.title}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">ID: {row.id}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                            {row.content}
                          </p>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(row)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                              row.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200"
                            }`}
                          >
                            {row.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {row.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingContext(row);
                                setContextForm({
                                  id: row.id,
                                  category: row.category,
                                  title: row.title,
                                  content: row.content,
                                  is_active: row.is_active,
                                  priority: row.priority || 1
                                });
                                setIsContextModalOpen(true);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-[#0B57D0] hover:bg-zinc-100 rounded-md transition-all cursor-pointer"
                              title="Edit Context"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingContextId(row.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                              title="Delete Context"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE CONVERSATION LOGS */}
        {activeTab === "logs" && (
          <div className="flex flex-col flex-1 h-full overflow-hidden gap-3">
            {/* Search & Actions */}
            <div className="flex items-center justify-between gap-2 p-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search chats by ID, visitor, or keywords..."
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#0B57D0]"
                />
              </div>

              <CustomButton
                variant="secondary"
                onClick={fetchConversations}
                disabled={logsLoading}
                className="flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
                Refresh Logs
              </CustomButton>
            </div>

            {/* Conversations Custom Table */}
            <div className="flex-1 w-full overflow-auto bg-white border border-slate-200 rounded-lg shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-zinc-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-3.5 py-2.5 w-[150px]">Conversation ID</th>
                    <th className="px-3.5 py-2.5 w-[180px]">Visitor / Contact</th>
                    <th className="px-3.5 py-2.5 w-[80px]">Turns</th>
                    <th className="px-3.5 py-2.5">Latest Message Preview</th>
                    <th className="px-3.5 py-2.5 w-[140px]">Last Activity</th>
                    <th className="px-3.5 py-2.5 w-[110px] text-right">Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-primary">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                          <span>Loading conversation logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredConversations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                        No visitor conversation logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredConversations.map((row) => {
                      const msgs = row.messages || [];
                      const lastMsg = msgs[msgs.length - 1];
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-[#0B57D0]">
                            {row.id}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-900">
                                {row.visitor_name || "Anonymous Visitor"}
                              </span>
                              {row.visitor_contact && (
                                <span className="text-[11px] text-zinc-500 font-mono">
                                  {row.visitor_contact}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">
                                {row.session_id}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded text-zinc-700">
                              {row.messages?.length || 0} msgs
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            {lastMsg ? (
                              <div className="flex items-start gap-1.5 max-w-xl">
                                <span className={`text-[10px] font-bold uppercase px-1 rounded ${
                                  lastMsg.sender === "visitor" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {lastMsg.sender === "visitor" ? "Visitor" : "Agent"}
                                </span>
                                <span className="text-xs text-zinc-600 truncate">
                                  {lastMsg.text}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">No messages</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-zinc-600">
                            {row.updated_at ? new Date(row.updated_at).toLocaleString("en-SG", { dateStyle: "short", timeStyle: "short" }) : "-"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <CustomButton
                              variant="secondary"
                              onClick={() => {
                                setSelectedConversation(row);
                                setIsTranscriptModalOpen(true);
                              }}
                              className="flex items-center gap-1 text-xs py-1 px-2 text-[#0B57D0]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Chat
                            </CustomButton>
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

        {/* TAB 3: LIVE SIMULATOR */}
        {activeTab === "simulator" && (
          <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden h-[calc(100vh-160px)]">
            {/* Simulator Header */}
            <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-zinc-900">Live Customer Service Concierge Simulator</span>
              </div>
              <button
                type="button"
                onClick={() => setSimulatorMessages([
                  {
                    id: "sim_init",
                    sender: "agent",
                    text: "Hello! I am your HSG Global customer support concierge. How may I assist you today?",
                    timestamp: Date.now()
                  }
                ])}
                className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Clear Chat
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              {simulatorMessages.map((msg) => {
                const isVisitor = msg.sender === "visitor";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isVisitor ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${
                      isVisitor ? "bg-amber-600" : "bg-[#1B4D2E]"
                    }`}>
                      {isVisitor ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[75%] rounded-lg p-3 text-xs leading-relaxed shadow-2xs ${
                      isVisitor
                        ? "bg-[#0B57D0] text-white rounded-tr-none"
                        : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-none"
                    }`}>
                      <div className="font-semibold text-[10px] mb-1 opacity-75">
                        {isVisitor ? "Visitor (You)" : "HSG Support Concierge"}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                );
              })}

              {simulatorLoading && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1B4D2E] text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-lg rounded-tl-none p-3 text-xs text-zinc-500 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-1.5 h-1.5 bg-[#1B4D2E] rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[#1B4D2E] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-[#1B4D2E] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    <span className="ml-1 text-[11px]">Thinking with live catalog context...</span>
                  </div>
                </div>
              )}
              <div ref={simulatorEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSimulatorSend} className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2">
              <input
                type="text"
                value={simulatorInput}
                onChange={(e) => setSimulatorInput(e.target.value)}
                placeholder="Ask anything about products, delivery MOQ, brands, or company details..."
                disabled={simulatorLoading}
                className="flex-1 text-xs px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0B57D0]"
              />
              <button
                type="submit"
                disabled={!simulatorInput.trim() || simulatorLoading}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        )}

      </div>

      {/* CONTEXT MODAL (ADD / EDIT) */}
      <Modal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        title={editingContext ? "Edit Knowledge Context Entry" : "Add New Knowledge Context"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveContext} className="flex flex-col gap-4 font-primary">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
              <select
                value={contextForm.category}
                onChange={(e) => setContextForm({ ...contextForm, category: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-md focus:ring-1 focus:ring-[#0B57D0]"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Priority Rank (1 = Top)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={contextForm.priority}
                onChange={(e) => setContextForm({ ...contextForm, priority: parseInt(e.target.value) || 1 })}
                className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-md focus:ring-1 focus:ring-[#0B57D0]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Title</label>
            <input
              type="text"
              placeholder="e.g. Singapore Delivery MOQ & Schedule"
              value={contextForm.title}
              onChange={(e) => setContextForm({ ...contextForm, title: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-md focus:ring-1 focus:ring-[#0B57D0]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Context Knowledge Guidelines & Content
            </label>
            <p className="text-[11px] text-zinc-500 mb-1.5">
              Provide specific factual details, rules, policies, or contact details for the chat concierge to reference.
            </p>
            <textarea
              rows={6}
              placeholder="Write detailed rules, MOQ, lead times, FAQ answers, or brand descriptions..."
              value={contextForm.content}
              onChange={(e) => setContextForm({ ...contextForm, content: e.target.value })}
              className="w-full text-xs p-3 bg-white border border-zinc-300 rounded-md focus:ring-1 focus:ring-[#0B57D0] leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_cb"
              checked={contextForm.is_active}
              onChange={(e) => setContextForm({ ...contextForm, is_active: e.target.checked })}
              className="rounded border-zinc-300 text-[#0B57D0] focus:ring-[#0B57D0]"
            />
            <label htmlFor="is_active_cb" className="text-xs font-semibold text-zinc-700 cursor-pointer">
              Active in live Chat Concierge knowledge base
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
            <CustomButton
              type="button"
              variant="default"
              onClick={() => setIsContextModalOpen(false)}
            >
              Cancel
            </CustomButton>
            <CustomButton
              type="submit"
              variant="dark"
              disabled={contextSaving}
            >
              {contextSaving ? "Saving..." : "Save Knowledge Entry"}
            </CustomButton>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM POPUP */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Knowledge Entry"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col gap-4 font-primary">
          <p className="text-xs text-zinc-600">
            Are you sure you want to delete this knowledge context entry? The concierge assistant will no longer reference this information.
          </p>
          <div className="flex justify-end gap-2">
            <CustomButton variant="default" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </CustomButton>
            <CustomButton variant="danger" onClick={handleDeleteContextConfirm}>
              Delete
            </CustomButton>
          </div>
        </div>
      </Modal>

      {/* VIEW TRANSCRIPT MODAL */}
      <Modal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        title={`Chat Transcript: ${selectedConversation?.id || ""}`}
        maxWidth="max-w-2xl"
      >
        {selectedConversation && (
          <div className="flex flex-col gap-3 font-primary max-h-[70vh]">
            {/* Metadata Summary */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Visitor</span>
                <span className="font-semibold text-zinc-800">{selectedConversation.visitor_name || "Anonymous Visitor"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Contact</span>
                <span className="font-mono text-zinc-800">{selectedConversation.visitor_contact || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Date / Time</span>
                <span className="font-mono text-zinc-800">
                  {selectedConversation.created_at ? new Date(selectedConversation.created_at).toLocaleString("en-SG") : "-"}
                </span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-zinc-50/60 rounded-lg border border-zinc-200 max-h-[400px]">
              {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                selectedConversation.messages.map((msg, i) => {
                  const isVisitor = msg.sender === "visitor";
                  return (
                    <div
                      key={msg.id || i}
                      className={`flex items-start gap-2 ${isVisitor ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${
                        isVisitor ? "bg-amber-600" : "bg-[#1B4D2E]"
                      }`}>
                        {isVisitor ? "V" : "CS"}
                      </div>
                      <div className={`max-w-[80%] rounded-lg p-2.5 text-xs leading-relaxed ${
                        isVisitor
                          ? "bg-[#0B57D0] text-white rounded-tr-none"
                          : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-none"
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="font-bold text-[10px] opacity-75">
                            {isVisitor ? "Visitor" : "HSG Concierge"}
                          </span>
                          <span className="text-[9px] opacity-60 font-mono">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-400 text-center py-6">No messages recorded in this conversation.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <CustomButton variant="default" onClick={() => setIsTranscriptModalOpen(false)}>
                Close
              </CustomButton>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
