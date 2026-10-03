"use client";
import * as React from "react";
import { RefreshCw, Send, Bot, Sparkles, Globe, MessageSquare, Plus, Trash2, ChevronRight, Check, History, Search, Bookmark, BookmarkCheck } from "lucide-react";
import {
  fetchDashboardAiBriefing,
  fetchUserChats,
  saveUserChat,
  deleteUserChat,
  UserChatSession,
} from "@/lib/api";
import { showToast } from "@/lib/toast";

interface DashboardAiSummaryProps {
  userName: string;
  profile?: any;
}

// Helper to determine the current 6 AM daily cycle ID (e.g. "2026-09-17_06:00")
// A cycle runs from 06:00 AM on Day X to 05:59:59 AM on Day X+1.
function getDaily6AmCycleId(date = new Date()): string {
  const d = new Date(date);
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}_06:00`;
}

export function DashboardAiSummary({ userName, profile }: DashboardAiSummaryProps) {
  const isAdmin = profile?.role === "Administrator" || profile?.role === "Admin";
  const userEmail = (profile?.email || "").toLowerCase().trim();

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [fullBriefingText, setFullBriefingText] = React.useState("");
  const [lastGeneratedAt, setLastGeneratedAt] = React.useState<string>("");
  const [isGeminiLive, setIsGeminiLive] = React.useState<boolean | null>(null);
  
  // External Data (Web Search) toggle state - default is false (Internal only)
  const [enableWebSearch, setEnableWebSearch] = React.useState<boolean>(false);

  // Active Chat Session ID
  const [activeChatId, setActiveChatId] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("ib_active_chat_id") || `chat_${Date.now()}`;
      } catch {}
    }
    return `chat_${Date.now()}`;
  });

  // Saved Chat Sessions list (loaded local-first, updated silently from server)
  const [savedChats, setSavedChats] = React.useState<UserChatSession[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ib_user_saved_chats");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  // Sequential bubble popup states
  // Initialize messages from localStorage
  const [displayedBubbles, setDisplayedBubbles] = React.useState<{ text: string; isFirst?: boolean; timestamp?: string; isAi?: boolean; isUser?: boolean }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ib_briefing_chat_history");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [isShowingIndicator, setIsShowingIndicator] = React.useState<boolean>(false);
  const [isTypingComplete, setIsTypingComplete] = React.useState<boolean>(true);

  const nextBubbleTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll helper that smoothly scrolls to the latest bottom bubble
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    } else if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  // Ensure scroll is at the very bottom whenever component mounts or displayedBubbles change
  React.useEffect(() => {
    scrollToBottom("auto");
    const t1 = setTimeout(() => scrollToBottom("auto"), 50);
    const t2 = setTimeout(() => scrollToBottom("auto"), 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [displayedBubbles.length, scrollToBottom]);

  // Persist current chat bubbles locally whenever they change (prevents clearing when switching menus)
  React.useEffect(() => {
    if (typeof window !== "undefined" && displayedBubbles.length > 0) {
      try {
        localStorage.setItem("ib_briefing_chat_history", JSON.stringify(displayedBubbles));
        localStorage.setItem("ib_active_chat_id", activeChatId);
      } catch {}
    }
  }, [displayedBubbles, activeChatId]);

  // Manual Save Conversation to Discussions history
  const handleSaveCurrentConversation = React.useCallback(async () => {
    if (displayedBubbles.length === 0) {
      showToast("No messages to save yet", "info");
      return;
    }

    const firstUserMsg = displayedBubbles.find(b => b.isUser)?.text || "";
    const firstAiMsg = displayedBubbles.find(b => !b.isUser)?.text || "";
    const title = firstUserMsg 
      ? (firstUserMsg.length > 32 ? firstUserMsg.slice(0, 30) + "..." : firstUserMsg)
      : "Operations Discussion";
    const preview = displayedBubbles[displayedBubbles.length - 1]?.text?.slice(0, 75) || firstAiMsg.slice(0, 75) || "";

    const sessionToSave: UserChatSession = {
      id: activeChatId,
      user_email: userEmail,
      title,
      preview,
      messages: displayedBubbles,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    setSavedChats((prev) => {
      const existingIdx = prev.findIndex(c => c.id === activeChatId);
      let nextList: UserChatSession[];
      if (existingIdx >= 0) {
        nextList = [...prev];
        nextList[existingIdx] = {
          ...nextList[existingIdx],
          preview,
          messages: displayedBubbles,
          updated_at: Date.now(),
        };
      } else {
        nextList = [sessionToSave, ...prev];
      }
      try {
        localStorage.setItem("ib_user_saved_chats", JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    if (userEmail) {
      saveUserChat(sessionToSave).catch((err) => {
        console.warn("Save chat server error:", err);
      });
    }

    showToast("Conversation saved to Discussions", "success");
  }, [displayedBubbles, activeChatId, userEmail]);

  // Initial load of server chats (merges into local-first list seamlessly)
  React.useEffect(() => {
    if (!userEmail) return;
    fetchUserChats(userEmail).then((res) => {
      if (res?.success && Array.isArray(res.chats) && res.chats.length > 0) {
        setSavedChats((localPrev) => {
          const map = new Map<string, UserChatSession>();
          res.chats.forEach(c => map.set(c.id, c));
          localPrev.forEach(c => {
            if (!map.has(c.id)) map.set(c.id, c);
          });
          const merged = Array.from(map.values()).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
          try {
            localStorage.setItem("ib_user_saved_chats", JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    }).catch(() => {});
  }, [userEmail]);

  // Select / Resume a past conversation
  const handleLoadChat = React.useCallback((chat: UserChatSession) => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    setActiveChatId(chat.id);
    const msgs = Array.isArray(chat.messages) ? chat.messages : [];
    setDisplayedBubbles(msgs);
    setIsShowingIndicator(false);
    setIsTypingComplete(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ib_active_chat_id", chat.id);
        localStorage.setItem("ib_briefing_chat_history", JSON.stringify(msgs));
      } catch {}
    }
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  // Start a fresh New Chat session (does not pollute saved discussions)
  const handleStartNewChat = React.useCallback(() => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    const newId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setActiveChatId(newId);
    setDisplayedBubbles([]);
    setIsShowingIndicator(true);
    setIsTypingComplete(false);

    const greetingText = getRandomBuddyGreeting(userName);
    nextBubbleTimeoutRef.current = setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const freshBubbles = [
        { text: greetingText, isFirst: true, timestamp: nowStr, isAi: true }
      ];
      setIsShowingIndicator(false);
      setDisplayedBubbles(freshBubbles);
      setIsTypingComplete(true);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ib_active_chat_id", newId);
          localStorage.setItem("ib_briefing_chat_history", JSON.stringify(freshBubbles));
        } catch {}
      }
    }, 250);
  }, [userName]);

  // Delete a saved conversation
  const handleDeleteChat = React.useCallback(async (e: React.MouseEvent, chatIdToDelete: string) => {
    e.stopPropagation();
    // 1. Remove locally immediately
    setSavedChats((prev) => {
      const updated = prev.filter(c => c.id !== chatIdToDelete);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ib_user_saved_chats", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // 2. If deleting the currently active chat, reset to fresh or load next
    if (activeChatId === chatIdToDelete) {
      handleStartNewChat();
    }

    // 3. Silent server delete
    if (userEmail) {
      deleteUserChat(chatIdToDelete, userEmail).catch((err) => {
        console.warn("Silent chat delete error:", err);
      });
    }
    showToast("Conversation deleted", "info");
  }, [activeChatId, userEmail, handleStartNewChat]);

  // Sequential bubble popup coordinator with pre-typing indicator for long text (supports appending)
  const startSequentialPopups = React.useCallback((items: string[], isAppend = false, isAi = true) => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);

    if (items.length === 0) {
      if (!isAppend) setDisplayedBubbles([]);
      setIsTypingComplete(true);
      return;
    }

    if (!isAppend) {
      setDisplayedBubbles([]);
    }
    setIsShowingIndicator(false);
    setIsTypingComplete(false);

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const showBubble = (bubbleIdx: number) => {
      if (bubbleIdx >= items.length) {
        setIsShowingIndicator(false);
        setIsTypingComplete(true);
        return;
      }

      const targetText = items[bubbleIdx];
      const isShort = targetText.length < 45;

      if (isShort) {
        setIsShowingIndicator(false);
        setDisplayedBubbles((prev) => [
          ...prev,
          { text: targetText, isFirst: !isAppend && prev.length === 0 && bubbleIdx === 0, timestamp: nowStr, isAi }
        ]);
        setTimeout(scrollToBottom, 20);

        if (bubbleIdx + 1 < items.length) {
          nextBubbleTimeoutRef.current = setTimeout(() => {
            showBubble(bubbleIdx + 1);
          }, 300);
        } else {
          setIsTypingComplete(true);
        }
      } else {
        setIsShowingIndicator(true);
        setTimeout(scrollToBottom, 20);

        nextBubbleTimeoutRef.current = setTimeout(() => {
          setIsShowingIndicator(false);
          setDisplayedBubbles((prev) => [
            ...prev,
            { text: targetText, isFirst: !isAppend && prev.length === 0 && bubbleIdx === 0, timestamp: nowStr, isAi }
          ]);
          setTimeout(scrollToBottom, 20);

          if (bubbleIdx + 1 < items.length) {
            nextBubbleTimeoutRef.current = setTimeout(() => {
              showBubble(bubbleIdx + 1);
            }, 350);
          } else {
            setIsTypingComplete(true);
          }
        }, 600);
      }
    };

    showBubble(0);
  }, [scrollToBottom]);

  // Initial load or fresh briefing
  const handleLoadInitialBriefing = React.useCallback(async () => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);

    setIsGenerating(true);
    setIsShowingIndicator(true);
    try {
      const res = await fetchDashboardAiBriefing(userName, profile, false);
      
      console.log("🤖 [iB Gemini AI] Initial Briefing Response:", {
        is_ai: res?.is_ai,
        source: res?.source,
        router_intent: res?.router_intent,
        matched_brain_cells: (res as any)?.matched_brain_cells_count,
        gemini_error: (res as any)?.debug_gemini_err || "None",
        key_source: (res as any)?.debug_gemini_key_source,
        full_payload: res
      });

      const isAi = res?.is_ai ?? false;
      setIsGeminiLive(isAi);
      const text = res?.text || `Good morning, ${userName}.\n\nToday we have orders on route, and drivers are active on schedule.`;
      setFullBriefingText(text);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastGeneratedAt(now);

      const parsed = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, false, isAi);
    } catch (err) {
      console.error("❌ [iB Gemini AI] Initial Briefing Failed:", err);
      setIsGeminiLive(false);
      const fallbackText = `Good morning, ${userName}.\n\nToday we have orders on route, and drivers are active on schedule.`;
      setFullBriefingText(fallbackText);
      const parsed = fallbackText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, false, false);
    } finally {
      setIsGenerating(false);
    }
  }, [userName, profile, startSequentialPopups]);

  const [userInput, setUserInput] = React.useState<string>("");

  // Request custom message or latest update (Appends below existing messages without greeting)
  const handleSendMessage = React.useCallback(async (customMessage?: string) => {
    const textToSend = (customMessage !== undefined ? customMessage : userInput).trim();
    if (!textToSend || isGenerating) return;
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);

    setUserInput("");
    setIsGenerating(true);
    setIsShowingIndicator(true);
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    
    // Add user question bubble first
    const updatedWithUser = [
      ...displayedBubbles,
      { text: textToSend, isUser: true as any, timestamp: timeNow }
    ];
    setDisplayedBubbles(updatedWithUser);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ib_briefing_chat_history", JSON.stringify(updatedWithUser));
      } catch {}
    }
    setTimeout(scrollToBottom, 20);

    try {
      // Pass full conversation history from localStorage / state and search scope flag
      const res = await fetchDashboardAiBriefing(
        userName, 
        profile, 
        true, 
        textToSend, 
        updatedWithUser,
        enableWebSearch
      );
      
      console.log("🤖 [iB Gemini AI] Response Details:", {
        is_ai: res?.is_ai,
        source: res?.source,
        router_intent: res?.router_intent,
        matched_brain_cells: (res as any)?.matched_brain_cells_count,
        gemini_error: (res as any)?.debug_gemini_err || "None",
        key_source: (res as any)?.debug_gemini_key_source,
        full_payload: res
      });

      const isAi = res?.is_ai ?? false;
      setIsGeminiLive(isAi);
      let text = res?.text || `Live update: All operations are currently proceeding on schedule.`;
      // Ensure no raw action blocks leak into chat bubbles
      text = text.replace(/```(?:wfe_action|json)?\s*\{[\s\S]*?\}\s*```/gi, "").trim();
      const parsed = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, true, isAi);
    } catch (err) {
      console.error("❌ [iB Gemini AI] Request Failed:", err);
      setIsGeminiLive(false);
      const fallbackText = `Live update: All operations are currently proceeding on schedule.`;
      const parsed = fallbackText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, true, false);
    } finally {
      setIsGenerating(false);
    }
  }, [userInput, isGenerating, displayedBubbles, userName, profile, enableWebSearch, scrollToBottom, startSequentialPopups]);

  // Request latest update pill shortcut
  const handleRequestLatestUpdate = React.useCallback(() => {
    handleSendMessage("Latest update please!");
  }, [handleSendMessage]);

  // Helper to determine the current time block (morning, afternoon, evening)
  const getCurrentTimeBlock = React.useCallback(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "morning";
    if (hr < 17) return "afternoon";
    return "evening";
  }, []);

// Helper to generate totally randomized, natural greetings from iBuddy
function getRandomBuddyGreeting(userName: string): string {
  const hr = new Date().getHours();
  const timePeriod = hr < 12 ? "morning" : hr < 17 ? "afternoon" : "evening";
  const name = userName ? userName.split(" ")[0] || userName : "there";

  const morningPool = [
    `Good morning, ${name}! iBuddy here — what should we look into today?`,
    `Hi ${name}! Morning! How can I help you kick off operations today?`,
    `Hey ${name}, hope your morning is going well. What update do you need?`,
    `Morning ${name}! Ready when you are — what are we tracking today?`,
    `Hey there ${name}! Good morning. What's on your agenda today?`,
    `Hi ${name}! Ready for the day. Ask me anything about orders, stock, or tasks!`,
    `Morning ${name}! iBuddy online. What can I pull up for you?`,
    `Hey ${name}! Hope you had a good start. What would you like to check?`
  ];

  const afternoonPool = [
    `Good afternoon, ${name}! iBuddy here — what can I help you with?`,
    `Hey ${name}, hope your afternoon is going smoothly. What update can I get you?`,
    `Hi ${name}! Afternoon check-in. What operations or tasks are you looking at?`,
    `Hey there ${name}! Ready to assist. What do you need an update on?`,
    `Hi ${name}! Good afternoon. What would you like to review next?`,
    `Hey ${name}! iBuddy ready. Need an update on TikTok, drivers, or stock?`,
    `Good afternoon, ${name}! What's next on your priority list?`
  ];

  const eveningPool = [
    `Good evening, ${name}! iBuddy here — wrapping up the day? What do you need?`,
    `Hey ${name}! Evening check-in. What closing summary or update can I get you?`,
    `Hi ${name}! Hope your day went well. What can I help you check tonight?`,
    `Good evening, ${name}! Ready for a quick operational recap whenever you are.`,
    `Hey there ${name}! Need a status check on deliveries, stock, or pending tasks?`
  ];

  const generalPool = [
    `Hi ${name}! Fresh chat ready. What can I help you with today?`,
    `Hey ${name}! iBuddy at your service. What are we checking?`,
    `All cleared and ready, ${name}! What would you like to know?`,
    `Hey ${name}! What update can I pull up for you right now?`,
    `Hi ${name}! Board reset. What's on your mind?`,
    `Ready when you are, ${name}! Ask me anything about iB operations.`
  ];

  const pool = timePeriod === "morning"
    ? [...morningPool, ...generalPool]
    : timePeriod === "afternoon"
    ? [...afternoonPool, ...generalPool]
    : [...eveningPool, ...generalPool];

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

  // Clear Chat function - resets chat with typing animation and totally randomized friendly iBuddy greeting
  const handleClearChat = React.useCallback(() => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    
    // Clear chat bubbles and show typing indicator immediately
    setDisplayedBubbles([]);
    setIsShowingIndicator(true);
    setIsTypingComplete(false);

    const greetingText = getRandomBuddyGreeting(userName);

    // Typing animation delay before popping up greeting
    nextBubbleTimeoutRef.current = setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const freshBubbles = [
        { text: greetingText, isFirst: true, timestamp: nowStr, isAi: true }
      ];

      setIsShowingIndicator(false);
      setDisplayedBubbles(freshBubbles);
      setIsTypingComplete(true);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ib_briefing_chat_history", JSON.stringify(freshBubbles));
          localStorage.setItem("ib_briefing_chat_cycle", getDaily6AmCycleId());
        } catch {}
      }
      setTimeout(scrollToBottom, 20);
    }, 650);

    showToast("Chat reset", "info");
  }, [userName, scrollToBottom]);

  const hasLoadedInitialRef = React.useRef(false);

  // Initial trigger on mount: Load greeting only if no previous chat exists in storage
  React.useEffect(() => {
    if (!hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = true;
      let hasCachedHistory = false;
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("ib_briefing_chat_history");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              hasCachedHistory = true;
            }
          }
        } catch {}
      }

      // If completely fresh with no history, load initial greeting
      if (!hasCachedHistory) {
        handleLoadInitialBriefing();
      }
    }
  }, [handleLoadInitialBriefing]);

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => {
      if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    };
  }, []);

  const [isHistoryOpen, setIsHistoryOpen] = React.useState<boolean>(false);

  return (
    <div className="w-full h-full min-w-0 flex flex-row bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden select-none font-primary">
      {/* Main Chat Conversation Area (Left / Center) */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0842A0] via-[#0B57D0] to-[#1A73E8] text-white flex items-center justify-center shadow-xs select-none shrink-0 border border-blue-400/30">
              <Bot className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white" />
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-zinc-950 leading-tight">
                  iBuddy
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200/60 leading-none">
                  <Sparkles className="w-2.5 h-2.5 text-[#0B57D0]" />
                  <span>AI Assistant</span>
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-normal mt-0.5">
                Operations &amp; Workspace Assistant
              </span>
            </div>
          </div>

          {/* Action Buttons: Save Conversation, New Chat & Toggle History */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentConversation}
              disabled={isGenerating || displayedBubbles.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Save current conversation to Discussions"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Chat</span>
            </button>
            <button
              type="button"
              onClick={handleStartNewChat}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#0B57D0] hover:bg-blue-100 border border-blue-200/60 transition cursor-pointer disabled:opacity-40"
              title="Start fresh conversation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(prev => !prev)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isHistoryOpen
                  ? "bg-slate-100 text-zinc-800 border-slate-300/80"
                  : "bg-white text-zinc-500 hover:text-zinc-800 border-slate-200"
              }`}
              title={isHistoryOpen ? "Hide discussions history" : "Show discussions history"}
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Chat Stream Area: Sequential Bubbles with clean light canvas */}
        <div
          ref={chatScrollRef}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#F8F9FC]"
        >
          {displayedBubbles.length > 0 || isShowingIndicator || isGenerating ? (
            <div className="flex flex-col space-y-2.5 w-full">
              {displayedBubbles.map((item, index) => {
                const isUser = (item as any).isUser === true;
                const isFirst = item.isFirst;

                if (isUser) {
                  return (
                    <div key={index} className="flex justify-end w-full">
                      <div className="relative bg-[#D3E3FD] text-zinc-900 border border-blue-200/60 text-xs sm:text-[13px] font-normal leading-relaxed shadow-xs px-4 py-2 rounded-2xl rounded-tr-xs max-w-[85%] transition-all animate-in fade-in duration-150">
                        <div className="text-[#041E49] pr-5 pb-0.5 whitespace-pre-wrap">
                          {item.text}
                        </div>
                        <div className="flex items-center justify-end text-[9px] text-blue-800/60 font-medium select-none -mt-1">
                          <span>{item.timestamp || "Now"}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={index} className="flex justify-start w-full">
                    <div
                      className={`relative bg-white text-zinc-900 border border-slate-200/60 text-xs sm:text-[13px] leading-relaxed font-sans shadow-xs px-4 py-2.5 max-w-[92%] transition-all animate-in fade-in zoom-in-95 duration-200 ${
                        isFirst
                          ? "rounded-2xl rounded-tl-xs"
                          : "rounded-2xl rounded-tl-md"
                      }`}
                    >
                      {/* WhatsApp top-left tail for the initial message */}
                      {isFirst && (
                        <span className="absolute -left-1.5 top-0 w-2.5 h-2.5 bg-white border-l border-t border-slate-200/60 [clip-path:polygon(100%_0,0_0,100%_100%)] pointer-events-none" />
                      )}

                      <div className="text-zinc-800 pr-5 pb-0.5 whitespace-pre-wrap">
                        {item.text}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[9px] text-zinc-400 select-none -mt-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            (item as any).isAi === false ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          title={(item as any).isAi === false ? "Rule Fallback" : "Live AI"}
                        />
                        <span>{item.timestamp || "Now"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pre-typing Animated 3-dot Bubble indicator before long text pops / during generation */}
              {(isShowingIndicator || isGenerating) && (
                <div
                  className={`relative self-start bg-white border border-slate-200/60 shadow-xs px-4 py-3 flex items-center gap-1.5 animate-in fade-in duration-150 ${
                    displayedBubbles.length === 0
                      ? "rounded-2xl rounded-tl-xs"
                      : "rounded-2xl rounded-tl-md"
                  }`}
                >
                  {displayedBubbles.length === 0 && (
                    <span className="absolute -left-1.5 top-0 w-2.5 h-2.5 bg-white border-l border-t border-slate-200/60 [clip-path:polygon(100%_0,0_0,100%_100%)] pointer-events-none" />
                  )}
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                </div>
              )}

              {/* Anchor ref for auto-scrolling to latest bottom bubble */}
              <div ref={messagesEndRef} className="h-0 w-full" />
            </div>
          ) : null}
        </div>

        {/* Bottom Chat Platform Input Bar with Quick Suggestion Tag & External Data Toggle */}
        <div className="p-3 sm:p-3.5 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0">
          {/* Quick Suggestion Tag Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar flex-nowrap">
            <button
              type="button"
              onClick={handleRequestLatestUpdate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <span>✨ Latest update</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("Check my task")}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <span>Check my task</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("Tiktok Status")}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <span>Tiktok Status</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("Merch Status")}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <span>Merch Status</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("Delivery Order status")}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <span>Delivery Orders</span>
            </button>
          </div>

          {/* Input Bar Form with Option 1 Inline Search Scope Pill */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-1.5 bg-[#F8F9FC] border border-slate-200 focus-within:border-[#0B57D0] focus-within:bg-white rounded-xl p-1.5 sm:p-2 transition-all shadow-2xs"
          >
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isGenerating && userInput.trim()) {
                    handleSendMessage();
                  }
                }
              }}
              placeholder={
                enableWebSearch
                  ? "Ask iBuddy with External Data & web browsing..."
                  : "Ask iBuddy anything about operations, tasks, or iB..."
              }
              disabled={isGenerating}
              rows={1}
              style={{
                minHeight: "36px",
                maxHeight: "100px",
                resize: "none",
              }}
              className="w-full px-2.5 py-1 bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none font-sans leading-relaxed overflow-y-auto"
            />

            {/* Bottom Controls inside prompt bar */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
              {/* Option 1: Inline Scope Toggle (Default: Internal iB, Active: External Data) */}
              <button
                type="button"
                onClick={() => setEnableWebSearch(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer select-none border ${
                  enableWebSearch
                    ? "bg-[#D3E3FD] text-[#041E49] border-[#0B57D0]/40 font-semibold shadow-2xs"
                    : "bg-white text-zinc-500 hover:text-zinc-800 border-slate-200 hover:bg-slate-50"
                }`}
                title={enableWebSearch ? "External web browsing enabled" : "Internal iB only (Click to search external data)"}
              >
                {enableWebSearch ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-[#0B57D0]" />
                    <span>External Data</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0]" />
                  </>
                ) : (
                  <>
                    <span className="text-zinc-400 text-[10px]">🔒</span>
                    <span>Internal Only</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={isGenerating || !userInput.trim()}
                className="h-8 px-3.5 flex items-center justify-center gap-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white cursor-pointer transition-all shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 text-xs font-semibold"
                title="Send message (Enter to send, Shift+Enter for new line)"
              >
                <span>Send</span>
                <Send size={12} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side: Conversation History Panel (Red-box section from design) */}
      {isHistoryOpen && (
        <div className="w-[230px] lg:w-[250px] shrink-0 border-l border-slate-100 bg-[#FBFBFC] flex flex-col h-full overflow-hidden animate-in fade-in duration-150">
          {/* History Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-800">Discussions</span>
            </div>
            <button
              type="button"
              onClick={handleStartNewChat}
              disabled={isGenerating}
              className="p-1 rounded-md text-[#0B57D0] hover:bg-blue-50 transition cursor-pointer"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-transparent">
            {savedChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 p-4 text-center text-zinc-400">
                <MessageSquare className="w-6 h-6 mb-1 text-zinc-300" />
                <span className="text-xs font-medium">No saved chats yet</span>
                <span className="text-[10px] mt-0.5 text-zinc-400">Conversations save automatically</span>
              </div>
            ) : (
              savedChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                const timeLabel = new Date(chat.updated_at || chat.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleLoadChat(chat)}
                    className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      isActive
                        ? "bg-[#D3E3FD]/40 border-blue-200/80 shadow-2xs"
                        : "bg-white hover:bg-slate-50 border-slate-200/60 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className={`text-xs font-semibold truncate ${isActive ? "text-[#0B57D0]" : "text-zinc-800"}`}>
                        {chat.title || "Discussion"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 rounded text-zinc-400 transition cursor-pointer shrink-0"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {chat.preview ? (
                      <p className="text-[11px] text-zinc-400 truncate leading-snug">
                        {chat.preview}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-0.5">
                      <span>{timeLabel}</span>
                      {isActive && (
                        <span className="text-[9px] font-bold text-[#0B57D0] uppercase tracking-wider">Active</span>
                      )}
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
