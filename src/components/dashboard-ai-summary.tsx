"use client";

import * as React from "react";
import { RefreshCw, Send } from "lucide-react";
import {
  fetchDashboardAiBriefing,
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

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [fullBriefingText, setFullBriefingText] = React.useState("");
  const [lastGeneratedAt, setLastGeneratedAt] = React.useState<string>("");
  const [isGeminiLive, setIsGeminiLive] = React.useState<boolean | null>(null);
  
  // Sequential bubble popup states
  // Initialize messages from localStorage (persists within current 6:00 AM daily cycle)
  const [displayedBubbles, setDisplayedBubbles] = React.useState<{ text: string; isFirst?: boolean; timestamp?: string; isAi?: boolean }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const currentCycle = getDaily6AmCycleId();
        const savedCycle = localStorage.getItem("ib_briefing_chat_cycle");

        // If cycle changed (e.g. opened after 6:00 AM next day), start fresh
        if (savedCycle && savedCycle !== currentCycle) {
          localStorage.removeItem("ib_briefing_chat_history");
          localStorage.setItem("ib_briefing_chat_cycle", currentCycle);
          return [];
        }

        const cached = localStorage.getItem("ib_briefing_chat_history");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
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

  // Save to localStorage whenever displayedBubbles change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const currentCycle = getDaily6AmCycleId();
        localStorage.setItem("ib_briefing_chat_history", JSON.stringify(displayedBubbles));
        localStorage.setItem("ib_briefing_chat_cycle", currentCycle);
      } catch {}
    }
  }, [displayedBubbles]);

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
    setTimeout(scrollToBottom, 20);

    try {
      // Pass full conversation history from localStorage / state
      const res = await fetchDashboardAiBriefing(
        userName, 
        profile, 
        true, 
        textToSend, 
        updatedWithUser
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
      const text = res?.text || `Live update: All operations are currently proceeding on schedule.`;
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
  }, [userInput, isGenerating, displayedBubbles, userName, profile, scrollToBottom, startSequentialPopups]);

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

  // Clear Chat function
  const handleClearChat = React.useCallback(() => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    setDisplayedBubbles([]);
    setIsShowingIndicator(false);
    setIsTypingComplete(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ib_briefing_chat_history");
        localStorage.setItem("ib_briefing_chat_cycle", getDaily6AmCycleId());
      } catch {}
    }
    showToast("Chat history cleared", "info");
  }, []);

  const hasLoadedInitialRef = React.useRef(false);

  // Initial trigger on mount or 6 AM cycle transition
  React.useEffect(() => {
    if (!hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = true;
      const currentCycle = getDaily6AmCycleId();
      let savedCycle = "";
      let hasCachedHistory = false;
      if (typeof window !== "undefined") {
        try {
          savedCycle = localStorage.getItem("ib_briefing_chat_cycle") || "";
          const cached = localStorage.getItem("ib_briefing_chat_history");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              hasCachedHistory = true;
            }
          }
        } catch {}
      }

      if (!hasCachedHistory || (savedCycle && savedCycle !== currentCycle)) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("ib_briefing_chat_cycle", currentCycle);
            if (savedCycle && savedCycle !== currentCycle) {
              localStorage.removeItem("ib_briefing_chat_history");
            }
          } catch {}
        }
        handleLoadInitialBriefing();
      } else if (!savedCycle && typeof window !== "undefined") {
        try {
          localStorage.setItem("ib_briefing_chat_cycle", currentCycle);
        } catch {}
      }
    }

    // Interval check every 30 seconds to automatically clear and start fresh at 6:00 AM if user is active
    const interval = setInterval(() => {
      const nowCycle = getDaily6AmCycleId();
      let activeCycle = "";
      try {
        activeCycle = localStorage.getItem("ib_briefing_chat_cycle") || "";
      } catch {}
      if (activeCycle && activeCycle !== nowCycle) {
        try {
          localStorage.removeItem("ib_briefing_chat_history");
          localStorage.setItem("ib_briefing_chat_cycle", nowCycle);
        } catch {}
        setDisplayedBubbles([]);
        handleLoadInitialBriefing();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [handleLoadInitialBriefing]);

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => {
      if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full h-full min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden select-none font-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#0B57D0] text-white flex items-center justify-center font-bold text-xs shadow-xs tracking-tight select-none shrink-0">
            iB
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-zinc-900 leading-tight">
              What&apos;s Happening Today
            </h2>
            <span className="text-[11px] text-zinc-400 font-normal mt-0.5">
              Internal Bridge Briefing Console
            </span>
          </div>
        </div>

        {/* Action Buttons: Clear Chat */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearChat}
            disabled={isGenerating || (displayedBubbles.length === 0 && !isShowingIndicator)}
            className="text-xs font-medium text-zinc-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 shadow-none px-2 py-1 select-none"
            title="Clear chat history"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Chat Stream Area: Sequential WhatsApp Bubbles */}
      <div
        ref={chatScrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-3 bg-[#F0F2F5]"
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

      {/* Bottom Chat Platform Input Bar with Quick Suggestion Tag */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0">
        {/* Quick Suggestion Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
          <button
            type="button"
            onClick={handleRequestLatestUpdate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <span>✨ Latest update please!</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Tiktok Status")}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <span>Tiktok Status</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Merch Status")}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <span>Merch Status</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Delivery Order status")}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <span>Delivery Order status</span>
          </button>
        </div>

        {/* Input Bar Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2.5"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask iB anything about operations, visit pacing, tasks, or knowledge base..."
              disabled={isGenerating}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#F8F9FC] focus:bg-white text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] shadow-2xs font-sans transition disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating || !userInput.trim()}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#0B57D0] hover:bg-[#0842A0] text-white border border-[#0B57D0] cursor-pointer shrink-0 transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            title="Send chat message"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
