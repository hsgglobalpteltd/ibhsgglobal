"use client";

import * as React from "react";
import { MenuButton } from "./menu-button";
import { ChevronLeft, ChevronRight, LogOut, Search, X } from "lucide-react";
import { menuConfig } from "@/config/menu-config";
import { APP_PAGES_CONFIG } from "@/config/modules-config";
import { canAccessPage, canViewModule } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface SidePanelProps {
  activeItem: string;
  onSelectMenu: (item: string) => void;
  onSelectSubModule?: (pageId: string, moduleTitle: string) => void;
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  profile: {
    name?: string;
    role: string;
    pages_access?: string[];
    modules_access?: any;
  } | null;
  onLogout: () => void;
}

export function SidePanel({
  activeItem,
  onSelectMenu,
  onSelectSubModule,
  user,
  profile,
  onLogout,
}: SidePanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const handleMenuClick = (itemId: string) => {
    onSelectMenu(itemId);
  };

  const handleToggleButtonClick = () => {
    setIsCollapsed(!isCollapsed);
  };

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setIsCollapsed(true);
    }
  }, []);

  React.useEffect(() => {
    const handleCollapse = () => {
      setIsCollapsed(true);
    };
    window.addEventListener("collapse-sidepanel", handleCollapse);
    return () => {
      window.removeEventListener("collapse-sidepanel", handleCollapse);
    };
  }, []);

  const isAdmin = profile?.role === "Administrator";

  // Filter items in menuConfig based on access permissions
  const visibleMenuItems = menuConfig.filter((item) => {
    if (item.id === "Administrator") {
      return isAdmin;
    }
    const pageModules = APP_PAGES_CONFIG.find((p) => p.id === item.id)?.modules.map((m) => m.title) || [];
    return canAccessPage(profile, item.id, pageModules);
  });

  // Flat list of all accessible modules for search
  const allAvailableModules = React.useMemo(() => {
    const list: { pageId: string; pageLabel: string; title: string; description: string }[] = [];
    APP_PAGES_CONFIG.forEach((page) => {
      if (page.id === "Administrator" && !isAdmin) return;
      page.modules.forEach((mod) => {
        if (canViewModule(profile, mod.title)) {
          list.push({
            pageId: page.id,
            pageLabel: page.label,
            title: mod.title,
            description: mod.description,
          });
        }
      });
    });
    return list;
  }, [profile, isAdmin]);

  const searchResults = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return allAvailableModules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.pageLabel.toLowerCase().includes(q)
    );
  }, [allAvailableModules, searchQuery]);

  const handleSelectSearchResult = (pageId: string, title: string) => {
    if (onSelectSubModule) {
      onSelectSubModule(pageId, title);
    } else {
      onSelectMenu(pageId);
    }
    setSearchQuery("");
  };

  return (
    <aside
      className={`side-panel relative flex h-screen flex-col justify-between bg-[#F0F4F9] p-6 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] select-none transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        isCollapsed ? "w-[72px] px-3" : "w-64"
      }`}
    >
      <div className="flex flex-col gap-5 overflow-x-hidden">
        {/* Header Section */}
        <div className="relative flex flex-col gap-1.5 min-h-[56px] justify-center px-2">
          {/* Collapsed Logo */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 transition-all duration-300 ease-in-out",
              isCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
            )}
          >
            <h1 className="font-primary text-xl font-bold tracking-tight text-zinc-950 bg-[#EEEEEE]/40 w-10 h-10 flex items-center justify-center rounded-lg shadow-sm">
              iB
            </h1>
          </div>

          {/* Expanded Header */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out origin-left",
              isCollapsed
                ? "opacity-0 scale-95 pointer-events-none max-w-0 overflow-hidden"
                : "opacity-100 scale-100 w-full"
            )}
          >
            <h1 className="font-primary text-xl font-bold tracking-tight text-zinc-950 truncate">
              iB HSG Global
            </h1>
            <p className="font-primary text-[10.5px] leading-tight font-medium text-zinc-500 truncate mt-0.5">
              Connecting Teams. Bridging Operations.
            </p>
          </div>
        </div>

        {/* Search Input Bar (Gmail / Google Workspace style) */}
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                setTimeout(() => searchInputRef.current?.focus(), 150);
              }}
              className="flex w-10 h-10 items-center justify-center rounded-lg text-zinc-600 hover:text-[#0B57D0] hover:bg-[#D3E3FD]/50 transition-all duration-200 shadow-2xs cursor-pointer border border-transparent"
              title="Search Modules"
            >
              <Search size={18} />
            </button>
          </div>
        ) : (
          <div className="px-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus-within:border-[#0B57D0] focus-within:ring-2 focus-within:ring-[#0B57D0]/15 transition-all shadow-2xs">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full bg-transparent text-xs text-zinc-800 placeholder-zinc-400 outline-none font-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search Results OR Normal Menu Items */}
        {searchQuery.trim() !== "" && !isCollapsed ? (
          <div className="flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden no-scrollbar max-h-[calc(100vh-280px)] pr-0.5">
            <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Search Results ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-500 italic bg-white/60 rounded-lg border border-slate-200/60">
                No matching modules
              </div>
            ) : (
              searchResults.map((m) => (
                <button
                  key={`${m.pageId}-${m.title}`}
                  type="button"
                  onClick={() => handleSelectSearchResult(m.pageId, m.title)}
                  className="w-full flex flex-col gap-0.5 p-2.5 rounded-lg text-left bg-white hover:bg-[#D3E3FD] border border-slate-200/80 hover:border-[#0B57D0]/30 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-zinc-900 group-hover:text-[#041E49] truncate">
                      {m.title}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 group-hover:bg-[#0B57D0] group-hover:text-white shrink-0 transition-colors">
                      {m.pageLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-700 line-clamp-1">
                    {m.description}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Menu Items Section */
          <nav className="flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden no-scrollbar max-h-[calc(100vh-280px)] pr-0.5">
            {visibleMenuItems.map((item) => (
              <MenuButton
                key={item.id}
                label={item.label}
                icon={item.icon}
                isActive={activeItem === item.id}
                isCollapsed={isCollapsed}
                onClick={() => handleMenuClick(item.id)}
              />
            ))}
          </nav>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-4">
        {/* User Profile Section */}
        <div className="relative flex flex-col border-t border-zinc-300/40 pt-4 px-2 min-h-[64px] justify-center">
          {/* Collapsed Log Out Button */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 transition-all duration-300 ease-in-out",
              isCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
            )}
          >
            <button
              onClick={onLogout}
              className="flex w-10 h-10 items-center justify-center rounded text-zinc-600 hover:text-zinc-950 hover:bg-[#EEEEEE] transition-all duration-200 shadow-sm cursor-pointer border-none bg-transparent"
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Expanded Profile Info */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out origin-left",
              isCollapsed
                ? "opacity-0 scale-95 pointer-events-none max-w-0 overflow-hidden"
                : "opacity-100 scale-100 w-full"
            )}
          >
            <div className="flex flex-col truncate px-2">
              <span className="font-primary text-sm font-semibold text-zinc-800 truncate">
                {profile?.name || user?.displayName || "Google User"}
              </span>
              <span className="font-primary text-[10px] text-zinc-500 truncate">
                {user?.email || ""}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-left text-xs text-zinc-600 hover:text-zinc-950 font-primary font-medium hover:underline focus-visible:outline-none w-fit cursor-pointer mt-0.5 border-none bg-transparent px-2"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Footer Section using font-footer */}
        <div
          className={cn(
            "px-2 pt-2 border-t border-zinc-300/20 transition-all duration-300 ease-in-out origin-left whitespace-nowrap",
            isCollapsed ? "opacity-0 max-h-0 overflow-hidden border-t-0 pt-0" : "opacity-100 max-h-16"
          )}
        >
          <p className="font-footer text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            Internal Bridge
          </p>
          <p className="font-footer text-[9px] text-zinc-400 mt-0.5">
            © 2026 HSG Global. All rights reserved.
          </p>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={handleToggleButtonClick}
        className="absolute bottom-[10%] right-0 translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 bg-[#EEEEEE] text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 z-10 cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
