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
  const [displayedBubbles, setDisplayedBubbles] = React.useState<string[]>([]);
  const [isShowingIndicator, setIsShowingIndicator] = React.useState<boolean>(false);
  const [isTypingComplete, setIsTypingComplete] = React.useState<boolean>(false);

  // Admin Preferences modal states
  const [isSettingsOpen, setIsSettingsOpen] = React.useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState<boolean>(false);
  const [adminPrefs, setAdminPrefs] = React.useState<AdminConsolePreferences>({
    track_orders: true,
    tiktok_orders: true,
    direct_orders: true,
    personal_tasks: true,
  });

  const nextBubbleTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);

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

  // Auto-scroll helper
  const scrollToBottom = React.useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  // Sequential bubble popup coordinator with pre-typing indicator for long text
  const startSequentialPopups = React.useCallback((items: string[]) => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);

    if (items.length === 0) {
      setDisplayedBubbles([]);
      setIsTypingComplete(true);
      return;
    }

    setDisplayedBubbles([]);
    setIsShowingIndicator(false);
    setIsTypingComplete(false);

    const showBubble = (bubbleIdx: number) => {
      if (bubbleIdx >= items.length) {
        setIsShowingIndicator(false);
        setIsTypingComplete(true);
        return;
      }

      const targetText = items[bubbleIdx];
      // Short text (e.g. greeting or short message): pop up straight away
      const isShort = targetText.length < 45 || bubbleIdx === 0;

      if (isShort) {
        setIsShowingIndicator(false);
        setDisplayedBubbles((prev) => [...prev, targetText]);
        setTimeout(scrollToBottom, 20);

        if (bubbleIdx + 1 < items.length) {
          nextBubbleTimeoutRef.current = setTimeout(() => {
            showBubble(bubbleIdx + 1);
          }, 300);
        } else {
          setIsTypingComplete(true);
        }
      } else {
        // Longer operational text: show pre-typing indicator (...) first, then pop full bubble!
        setIsShowingIndicator(true);
        setTimeout(scrollToBottom, 20);

        nextBubbleTimeoutRef.current = setTimeout(() => {
          setIsShowingIndicator(false);
          setDisplayedBubbles((prev) => [...prev, targetText]);
          setTimeout(scrollToBottom, 20);

          if (bubbleIdx + 1 < items.length) {
            nextBubbleTimeoutRef.current = setTimeout(() => {
              showBubble(bubbleIdx + 1);
            }, 350);
          } else {
            setIsTypingComplete(true);
          }
        }, 650);
      }
    };

    showBubble(0);
  }, [scrollToBottom]);

  const handleRefresh = React.useCallback(async () => {
    if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);

    setIsGenerating(true);
    try {
      const res = await fetchDashboardAiBriefing(userName, profile);
      const text = res?.text || `Good morning, ${userName}.\n\nToday we have orders to deliver, and drivers are on standby.\n\nFor TikTok orders, we have pending orders to pack.\n\nFor your project tasks, you have no pending tasks scheduled for today.`;
      setFullBriefingText(text);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastGeneratedAt(now);

      const parsed = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed);
    } catch (err) {
      console.error("Failed to load live briefing:", err);
      const fallbackText = `Good morning, ${userName}.\n\nToday we have orders to deliver, and drivers are on standby.\n\nFor TikTok orders, we have pending orders to pack.\n\nFor your project tasks, you have no pending tasks scheduled for today.`;
      setFullBriefingText(fallbackText);
      const parsed = fallbackText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      startSequentialPopups(parsed);
    } finally {
      setIsGenerating(false);
    }
  }, [userName, profile, startSequentialPopups]);

  // Initial trigger on mount
  React.useEffect(() => {
    handleRefresh();
    return () => {
      if (nextBubbleTimeoutRef.current) clearTimeout(nextBubbleTimeoutRef.current);
    };
  }, [handleRefresh]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await saveAdminConsolePreferences(userEmail, adminPrefs);
      showToast("Briefing preferences updated", "success");
      setIsSettingsOpen(false);
      // Trigger instant refresh with new preferences
      handleRefresh();
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

        {/* Action Buttons: Settings (Admin only) & Refresh */}
        <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isGenerating}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 hover:text-[#0B57D0] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh briefing"
          >
            <RefreshCw size={14} className={isGenerating ? "animate-spin text-[#0B57D0]" : ""} />
          </button>
        </div>
      </div>

      {/* Main Chat Stream Area: Sequential WhatsApp Bubbles */}
      <div
        ref={chatScrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-3 bg-[#F0F2F5]"
      >
        {displayedBubbles.length > 0 || isShowingIndicator ? (
          <div className="flex flex-col items-start space-y-2.5 max-w-2xl">
            {displayedBubbles.map((text, index) => {
              const isFirst = index === 0;

              return (
                <div
                  key={index}
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
                    {text}
                  </div>

                  {/* Timestamp in bottom-right corner */}
                  <div className="flex items-center justify-end text-[10px] text-zinc-400 font-medium select-none -mt-1">
                    <span>{lastGeneratedAt || "Today"}</span>
                  </div>
                </div>
              );
            })}

            {/* Pre-typing Animated 3-dot Bubble indicator before long text pops */}
            {isShowingIndicator && (
              <div className="relative bg-white border border-slate-200/60 shadow-xs px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-1.5 animate-in fade-in duration-150">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Bottom Chat Platform Input Bar */}
      <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Ask iB anything about operations, orders, or module tutorials..."
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-[#F8F9FC] text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none cursor-not-allowed opacity-90 shadow-2xs font-sans"
          />
        </div>
        <button
          type="button"
          disabled
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 text-zinc-400 border border-slate-200 cursor-not-allowed shrink-0 transition-all shadow-2xs"
          title="Interactive chat coming soon"
        >
          <Send size={14} />
        </button>
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
