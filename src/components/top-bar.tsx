"use client";

import * as React from "react";
import { X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  breadcrumbPath: string[];
  onBack: () => void;
  onNavigateBreadcrumb?: (index: number) => void;
}

export function TopBar({ breadcrumbPath, onBack, onNavigateBreadcrumb }: TopBarProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string>("");
  const [isRed, setIsRed] = React.useState(false);
  
  const lastClickTimeRef = React.useRef<number>(Date.now());
  const redTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = React.useRef(isRefreshing);

  React.useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const startRedTimer = React.useCallback(() => {
    if (redTimeoutRef.current) {
      clearTimeout(redTimeoutRef.current);
    }
    setIsRed(false);
    redTimeoutRef.current = setTimeout(() => {
      setIsRed(true);
    }, 5 * 60 * 1000); // 5 minutes
  }, []);

  const triggerRefreshAnimation = React.useCallback(() => {
    if (isRefreshingRef.current) return;
    setIsRefreshing(true);
    lastClickTimeRef.current = Date.now();
    startRedTimer();

    // Simulate fetching new data in the background (1 second delay)
    setTimeout(() => {
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsRefreshing(false);
    }, 1000);
  }, [startRedTimer]);

  const handleRefresh = React.useCallback(() => {
    // Dispatch global event so database listeners load fresh data
    window.dispatchEvent(new CustomEvent("db-refresh"));
  }, []);

  React.useEffect(() => {
    const handleDbRefreshEvent = () => {
      triggerRefreshAnimation();
    };
    window.addEventListener("db-refresh", handleDbRefreshEvent);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefreshEvent);
    };
  }, [triggerRefreshAnimation]);

  React.useEffect(() => {
    // Set initial timestamp on mount
    const now = new Date();
    setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    
    // Start initial 5-minute red timer
    startRedTimer();

    // 1-hour auto-click listener on window
    const handleWindowClick = () => {
      const timeSinceLast = Date.now() - lastClickTimeRef.current;
      if (timeSinceLast >= 60 * 60 * 1000) { // 1 hour
        handleRefresh();
      }
    };

    window.addEventListener("click", handleWindowClick, true);

    return () => {
      if (redTimeoutRef.current) {
        clearTimeout(redTimeoutRef.current);
      }
      window.removeEventListener("click", handleWindowClick, true);
    };
  }, [startRedTimer, handleRefresh]);

  return (
    <header className="top-bar flex h-9 w-full items-center bg-[#F0F4F9] px-6 border-b border-slate-200 select-none relative z-40">
      {/* Left: Breadcrumbs only (vertically centered in h-9) */}
      <div className="flex items-center gap-2">
        {breadcrumbPath.map((segment, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-zinc-400 font-medium text-xs font-primary">/</span>}
            {idx === breadcrumbPath.length - 1 ? (
              <span className="text-sm font-semibold font-primary tracking-wide text-zinc-950">
                {segment}
              </span>
            ) : (
              <button
                onClick={() => onNavigateBreadcrumb && onNavigateBreadcrumb(idx)}
                className="text-sm font-medium font-primary tracking-wide text-zinc-500 hover:text-zinc-800 cursor-pointer focus:outline-none transition-all"
              >
                {segment}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Right: Floating Outline Buttons (Back as X and Refresh) */}
      <div className="absolute right-6 top-full -translate-y-1/2 flex items-center gap-1.5 z-20">
        {breadcrumbPath.length > 1 && (
          <button
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white hover:bg-slate-100 text-[#474747] hover:text-[#1F1F1F] transition-all border border-slate-200 focus:outline-none cursor-pointer shadow-xs"
            title="Close / Exit simulation"
          >
            <X size={14} />
          </button>
        )}

        <div className="relative group flex items-center">
          <button
            id="global-refresh-button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-all border focus:outline-none cursor-pointer disabled:opacity-75 shadow-xs",
              isRed
                ? "bg-red-500 border-red-600 text-white hover:bg-red-600 hover:border-red-700"
                : "bg-white border-slate-200 text-[#474747] hover:text-[#1F1F1F] hover:bg-slate-100"
            )}
            title={isRed ? "Data is older than 5 minutes. Click to refresh." : "Refresh data"}
          >
            <RefreshCw 
              size={13} 
              className={cn(isRefreshing ? "animate-spin-custom" : "transition-transform duration-200")} 
            />
          </button>

          {/* Custom Tooltip matching #EEEEEE theme (no true white) */}
          <div className="absolute right-0 top-9 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-20 origin-top-right">
            <div className="bg-[#EEEEEE] border border-zinc-300/80 rounded-lg px-3 py-1.5 shadow-md text-[10px] text-zinc-600 font-primary whitespace-nowrap">
              Last updated: {lastUpdated}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
