"use client";

import * as React from "react";

export interface TabItem {
  id: string;
  label: string;
  desc?: string;
}

interface NavigationTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  titleSuffix?: string; // e.g. "Registry" or custom string
  action?: React.ReactNode; // Optional slot for right-aligned items
  hideHeader?: boolean; // Optional flag to completely skip rendering the title and description block
}

export function NavigationTabs({ 
  tabs, 
  activeTabId, 
  onTabSelect, 
  titleSuffix = "",
  action,
  hideHeader = false
}: NavigationTabsProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const displayTitle = activeTab 
    ? (titleSuffix ? `${activeTab.label} ${titleSuffix}` : activeTab.label) 
    : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-Navigation Tabs Switcher Bar */}
      <div className="flex items-center justify-between border-b border-zinc-300/40 pb-px">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabSelect(tab.id)}
              className={`px-6 py-2.5 font-primary text-sm font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                activeTabId === tab.id
                  ? "border-[#0B57D0] text-[#0B57D0]"
                  : "border-transparent text-[#474747] hover:text-[#1F1F1F]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {action && (
          <div className="pb-1">
            {action}
          </div>
        )}
      </div>

    </div>
  );
}
