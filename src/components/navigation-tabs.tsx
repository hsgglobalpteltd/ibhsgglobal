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
  titleSuffix?: string;
  action?: React.ReactNode;
  hideHeader?: boolean;
}

export function NavigationTabs({ 
  tabs, 
  activeTabId, 
  onTabSelect
}: NavigationTabsProps) {
  // Dispatch tab configuration to the TopBar whenever it changes
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("set-topbar-tabs", {
        detail: { tabs, activeTabId }
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("set-topbar-tabs", {
          detail: null
        })
      );
    };
  }, [tabs, activeTabId]);

  // Listen to tab selection events coming from the TopBar
  React.useEffect(() => {
    const handleTopbarSelect = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        onTabSelect(customEvent.detail);
      }
    };

    window.addEventListener("topbar-select-tab", handleTopbarSelect);
    return () => {
      window.removeEventListener("topbar-select-tab", handleTopbarSelect);
    };
  }, [onTabSelect]);

  return null; // Rendered in TopBar instead!
}
