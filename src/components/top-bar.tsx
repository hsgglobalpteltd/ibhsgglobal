"use client";

import * as React from "react";
import { RefreshCw, Download } from "lucide-react";
import { usePWA } from "@/lib/usePWA";
import { cn } from "@/lib/utils";
import { TabItem } from "./navigation-tabs";

interface TopBarProps {
  breadcrumbPath: string[];
  onBack: () => void;
  onNavigateBreadcrumb?: (index: number) => void;
}

export function TopBar({ breadcrumbPath, onBack, onNavigateBreadcrumb }: TopBarProps) {
  const { isInstallable, installApp } = usePWA();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string>("");
  
  const [tabs, setTabs] = React.useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string>("");
  
  const lastClickTimeRef = React.useRef<number>(Date.now());
  const isRefreshingRef = React.useRef(isRefreshing);

  React.useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const triggerRefreshAnimation = React.useCallback(() => {
    if (isRefreshingRef.current) return;
    setIsRefreshing(true);
    lastClickTimeRef.current = Date.now();

    // Simulate fetching new data in the background (1 second delay)
    setTimeout(() => {
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsRefreshing(false);
    }, 1000);
  }, []);

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

    // 5-minute inactivity auto-refresh listener on window click
    const handleWindowClick = () => {
      const currentTime = Date.now();
      const timeSinceLast = currentTime - lastClickTimeRef.current;
      if (timeSinceLast >= 5 * 60 * 1000) { // 5 minutes of inactivity
        handleRefresh();
      }
      lastClickTimeRef.current = currentTime;
    };

    window.addEventListener("click", handleWindowClick, true);

    return () => {
      window.removeEventListener("click", handleWindowClick, true);
    };
  }, [handleRefresh]);

  // Listen to set-topbar-tabs event from sub-modules
  React.useEffect(() => {
    const handleSetTabs = (e: Event) => {
      const customEvent = e as CustomEvent<{ tabs: TabItem[]; activeTabId: string } | null>;
      if (customEvent.detail) {
        setTabs(customEvent.detail.tabs);
        setActiveTabId(customEvent.detail.activeTabId);
      } else {
        setTabs([]);
        setActiveTabId("");
      }
    };
    window.addEventListener("set-topbar-tabs", handleSetTabs);
    return () => {
      window.removeEventListener("set-topbar-tabs", handleSetTabs);
    };
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
    window.dispatchEvent(new CustomEvent("topbar-select-tab", { detail: tabId }));
  };

  return (
    <header className="top-bar flex h-14 w-full items-center bg-[#F0F4F9] px-6 border-b border-slate-200 select-none relative z-40">
      {/* Left: Breadcrumbs only (vertically centered in h-14) */}
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

      {/* Right: Buttons inside TopBar (Refresh & Tabs) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20">
        {/* Sub-Navigation Tabs Switcher inside TopBar */}
        {tabs.length > 0 && (
          <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1.5 h-7">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "px-3 py-1 font-primary text-xs font-bold rounded transition-all duration-200 cursor-pointer outline-none focus:outline-none select-none",
                  activeTabId === tab.id
                    ? "bg-[#D3E3FD] text-[#0B57D0]"
                    : "text-[#474747] hover:text-[#1F1F1F] hover:bg-slate-100"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {isInstallable && (
          <div className="relative group flex items-center pr-1">
            <button
              onClick={installApp}
              className="flex h-7 px-3 gap-1.5 items-center justify-center rounded-full transition-all border border-[#0B57D0]/20 bg-[#D3E3FD] hover:bg-[#B4D2FE] text-[#0B57D0] focus:outline-none cursor-pointer shadow-xs font-primary text-xs font-bold"
            >
              <Download size={13} />
              <span>Install App</span>
            </button>
            <div className="absolute right-0 top-9 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-20 origin-top-right">
              <div className="bg-[#EEEEEE] border border-zinc-300/80 rounded-lg px-3 py-1.5 shadow-md text-[10px] text-zinc-650 font-primary whitespace-nowrap">
                Install iB Desktop App
              </div>
            </div>
          </div>
        )}

        <div className="relative group flex items-center">
          <button
            id="global-refresh-button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-all border focus:outline-none cursor-pointer disabled:opacity-75 shadow-xs bg-white border-slate-200 text-[#474747] hover:text-[#1F1F1F] hover:bg-slate-100"
          >
            <RefreshCw 
              size={13} 
              className={cn(isRefreshing ? "animate-spin-custom" : "transition-transform duration-200")} 
            />
          </button>

          {/* Custom Tooltip matching #EEEEEE theme (no true white) */}
          <div className="absolute right-0 top-9 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-20 origin-top-right">
            <div className="bg-[#EEEEEE] border border-zinc-300/80 rounded-lg px-3 py-1.5 shadow-md text-[10px] text-zinc-650 font-primary whitespace-nowrap">
              Last updated: {lastUpdated}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
