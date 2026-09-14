"use client";

import * as React from "react";
import { Sparkles, RefreshCw, CheckCircle2, Bot, ChevronRight, Zap } from "lucide-react";
import { fetchDashboardAiBriefing } from "@/lib/api";

interface DashboardAiSummaryProps {
  userName: string;
}

export function DashboardAiSummary({ userName }: DashboardAiSummaryProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [displayedText, setDisplayedText] = React.useState("");
  const [fullBriefingText, setFullBriefingText] = React.useState("");
  const [isTypingComplete, setIsTypingComplete] = React.useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = React.useState<string>("");
  const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Typewriter animation reveal effect
  const startTypewriter = React.useCallback((fullText: string) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }
    setDisplayedText("");
    setIsTypingComplete(false);

    let currentIndex = 0;
    const speed = 12; // ms per chunk for smooth, engaging typing

    typingTimerRef.current = setInterval(() => {
      if (currentIndex < fullText.length) {
        // Type 2-3 characters at a time for natural speed
        const nextIndex = Math.min(currentIndex + 3, fullText.length);
        setDisplayedText(fullText.slice(0, nextIndex));
        currentIndex = nextIndex;
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTypingComplete(true);
      }
    }, speed);
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetchDashboardAiBriefing(userName);
      const text = res?.text || `Good day, ${userName}. So far no order yet.. and driver are standby. waiting for order.`;
      setFullBriefingText(text);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastGeneratedAt(now);
      startTypewriter(text);
    } catch (err) {
      console.error("Failed to load live briefing:", err);
      const fallbackText = `Good day, ${userName}. So far no orders yet, and drivers are on standby waiting for orders.`;
      setFullBriefingText(fallbackText);
      startTypewriter(fallbackText);
    } finally {
      setIsGenerating(false);
    }
  }, [userName, startTypewriter]);

  // Initial trigger on mount
  React.useEffect(() => {
    handleRefresh();
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [handleRefresh]);

  const handleSkipTyping = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setDisplayedText(fullBriefingText);
    setIsTypingComplete(true);
  };

  return (
    <div className="w-[420px] min-w-[420px] h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden select-none font-primary">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/40 via-white to-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D3E3FD] text-[#0B57D0] flex items-center justify-center shadow-2xs">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-950">AI Operations Briefing</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100/70 text-[#0B57D0] text-[9px] font-bold">
                Gemini
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-normal">
              Live multi-module intelligence
            </span>
          </div>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isGenerating}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 hover:text-[#0B57D0] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          title="Regenerate live summary"
        >
          <RefreshCw size={13} className={isGenerating ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Main Content Area with Typing Animation */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col justify-between gap-4">
        <div className="relative">
          <div className="text-xs leading-relaxed text-zinc-700 whitespace-pre-line font-normal tracking-normal font-sans">
            {displayedText}
            {!isTypingComplete && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#0B57D0] animate-pulse align-middle" />
            )}
          </div>
        </div>

        {/* Bottom Bar: Skip typing or status indicator */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>Updated {lastGeneratedAt || "just now"}</span>
          </div>

          {!isTypingComplete ? (
            <button
              type="button"
              onClick={handleSkipTyping}
              className="text-[#0B57D0] hover:text-[#0842A0] font-semibold text-[11px] hover:underline cursor-pointer"
            >
              Reveal All
            </button>
          ) : (
            <span className="text-[10px] font-medium text-zinc-400">
              Synced with worker db
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
