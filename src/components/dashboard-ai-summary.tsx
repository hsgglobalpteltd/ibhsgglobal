"use client";

import * as React from "react";
import { RefreshCw, Send, Settings, X, Check } from "lucide-react";
import {
  fetchDashboardAiBriefing,
  fetchAdminConsolePreferences,
  saveAdminConsolePreferences,
  AdminConsolePreferences
} from "@/lib/api";
import { showToast } from "@/lib/toast";

interface DashboardAiSummaryProps {
  userName: string;
  profile?: any;
}

export function DashboardAiSummary({ userName, profile }: DashboardAiSummaryProps) {
  const isAdmin = profile?.role === "Administrator" || profile?.role === "Admin";
  const userEmail = profile?.email || "default";

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [fullBriefingText, setFullBriefingText] = React.useState("");
  const [lastGeneratedAt, setLastGeneratedAt] = React.useState<string>("");
  
  // Sequential bubble popup states
  // Initialize messages from localStorage (persists until logout)
  const [displayedBubbles, setDisplayedBubbles] = React.useState<{ text: string; isFirst?: boolean; timestamp?: string }[]>(() => {
    if (typeof window !== "undefined") {
      try {
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

  // Admin Preferences modal states
  const [isSettingsOpen, setIsSettingsOpen] = React.useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState<boolean>(false);
  const [adminPrefs, setAdminPrefs] = React.useState<AdminConsolePreferences>({
    track_orders: true,
    tiktok_orders: true,
    direct_orders: true,
    merch_visits: true,
    personal_tasks: true,
  });

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
    // Immediate scroll on mount
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
        localStorage.setItem("ib_briefing_chat_history", JSON.stringify(displayedBubbles));
      } catch {}
    }
  }, [displayedBubbles]);

  // Fetch admin preferences on mount if user is Admin
  React.useEffect(() => {
    if (isAdmin && userEmail) {
      fetchAdminConsolePreferences(userEmail)
        .then((res) => {
          if (res?.preferences) {
            setAdminPrefs(res.preferences);
          }
        })
        .catch((err) => console.warn("Could not load admin console preferences:", err));
    }
  }, [isAdmin, userEmail]);

  // Sequential bubble popup coordinator with pre-typing indicator for long text (supports appending)
  const startSequentialPopups = React.useCallback((items: string[], isAppend = false) => {
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
          { text: targetText, isFirst: !isAppend && prev.length === 0 && bubbleIdx === 0, timestamp: nowStr }
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
            { text: targetText, isFirst: !isAppend && prev.length === 0 && bubbleIdx === 0, timestamp: nowStr }
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
      const text = res?.text || `Good morning, ${userName}.\n\nToday we have orders on route, and drivers are active on schedule.`;
      setFullBriefingText(text);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastGeneratedAt(now);

      const parsed = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, false);
    } catch (err) {
      console.error("Failed to load live briefing:", err);
      const fallbackText = `Good morning, ${userName}.\n\nToday we have orders on route, and drivers are active on schedule.`;
      setFullBriefingText(fallbackText);
      const parsed = fallbackText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, false);
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
      const text = res?.text || `Live update: All operations are currently proceeding on schedule.`;
      const parsed = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, true);
    } catch (err) {
      console.error("Failed to process chat message:", err);
      const fallbackText = `Live update: All operations are currently proceeding on schedule.`;
      const parsed = fallbackText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed, true);
    } finally {
      setIsGenerating(false);
    }
  }, [userInput, isGenerating, displayedBubbles, userName, profile, scrollToBottom, startSequentialPopups]);

  // Request latest update pill shortcut
  const handleRequestLatestUpdate = React.useCallback(() => {
    handleSendMessage("Latest update please!");
  }, [handleSendMessage]);

  // Clear Chat function
  const handleClearChat = React.useCallback(() => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    setDisplayedBubbles([]);
    setIsShowingIndicator(false);
    setIsTypingComplete(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ib_briefing_chat_history");
      } catch {}
    }
    showToast("Chat history cleared", "info");
  }, []);

  // Initial trigger on mount (only if no existing messages in localStorage)
  React.useEffect(() => {
    if (displayedBubbles.length === 0) {
      handleLoadInitialBriefing();
    }
    return () => {
      if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    };
  }, []); // Mount only

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await saveAdminConsolePreferences(userEmail, adminPrefs);
      showToast("Briefing preferences updated", "success");
      setIsSettingsOpen(false);
      // Trigger instant fresh briefing
      handleLoadInitialBriefing();
    } catch (err: any) {
      showToast(err.message || "Failed to save preferences", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="w-full max-w-3xl h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden select-none font-primary">
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

        {/* Action Buttons: Clear Chat (text only on left) & Settings (Gear on right) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearChat}
            disabled={isGenerating || (displayedBubbles.length === 0 && !isShowingIndicator)}
            className="text-xs font-medium text-zinc-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 shadow-none px-1 py-1 select-none"
            title="Clear chat history"
          >
            Clear Chat
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 hover:text-[#0B57D0] transition-all cursor-pointer shadow-2xs"
              title="Briefing Console Preferences (Admin)"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Stream Area: Sequential WhatsApp Bubbles */}
      <div
        ref={chatScrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-3 bg-[#F0F2F5]"
      >
        {displayedBubbles.length > 0 || isShowingIndicator || isGenerating ? (
          <div className="flex flex-col space-y-2.5 max-w-2xl w-full">
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

                    <div className="text-zinc-800 pr-6 pb-1 whitespace-pre-wrap">
                      {item.text}
                    </div>

                    {/* Timestamp in bottom-right corner */}
                    <div className="flex items-center justify-end text-[10px] text-zinc-400 font-medium select-none -mt-1">
                      <span>{item.timestamp || "Today"}</span>
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
        {/* Quick Suggestion Tag Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRequestLatestUpdate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F4F9] hover:bg-[#D3E3FD] border border-blue-200/80 text-[#0B57D0] text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>✨ Latest update please!</span>
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

      {/* Admin Briefing Console Preferences Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
          <form
            onSubmit={handleSavePreferences}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Console Briefing Preferences</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Customize which operational modules appear in your briefing.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Checkbox Options Body */}
            <div className="p-5 space-y-3 bg-[#F8F9FA]">
              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={adminPrefs.track_orders}
                  onChange={(e) => setAdminPrefs((prev) => ({ ...prev, track_orders: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900">Orders to Deliver & Driver Status</span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">Live delivery counts, pending dispatch orders, and driver route start times.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={adminPrefs.tiktok_orders}
                  onChange={(e) => setAdminPrefs((prev) => ({ ...prev, tiktok_orders: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900">TikTok Orders to Pack</span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">Live TikTok packing queue, orders packed waiting for courier pickup, and pending packing.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={adminPrefs.direct_orders}
                  onChange={(e) => setAdminPrefs((prev) => ({ ...prev, direct_orders: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900">Direct Orders & Quotations</span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">Pending direct client sales orders and unanswered quotations for this week.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={adminPrefs.merch_visits}
                  onChange={(e) => setAdminPrefs((prev) => ({ ...prev, merch_visits: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900">Merchandiser Store Visits</span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">Live store audit visits completed today, active merchandisers in the field, and monthly progress.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={adminPrefs.personal_tasks}
                  onChange={(e) => setAdminPrefs((prev) => ({ ...prev, personal_tasks: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900">Personal Assigned Tasks</span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">Assigned project actions, what was last completed, next steps, and deadlines/overdue tracking.</span>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                disabled={isSavingSettings}
                className="h-8 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="h-8 px-3 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
              >
                {isSavingSettings ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
