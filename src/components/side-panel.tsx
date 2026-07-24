"use client";

import * as React from "react";
import { MenuButton } from "./menu-button";
import { ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import { menuConfig } from "@/config/menu-config";
import { cn } from "@/lib/utils";

interface SidePanelProps {
  activeItem: string;
  onSelectMenu: (item: string) => void;
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  profile: {
    name?: string;
    role: string;
    pages_access: string[];
  } | null;
  onLogout: () => void;
}

export function SidePanel({ activeItem, onSelectMenu, user, profile, onLogout }: SidePanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [stayOpen, setStayOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const collapseTimeoutRef = React.useRef<any>(null);

  const startCollapseTimer = React.useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
    }
    collapseTimeoutRef.current = setTimeout(() => {
      setStayOpen(false);
      setIsCollapsed(true);
    }, 60000); // 1 minute
  }, []);

  const clearCollapseTimer = React.useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    clearCollapseTimer();
    setIsCollapsed(false);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (stayOpen) {
      startCollapseTimer();
    } else {
      setIsCollapsed(true);
    }
  };

  const handleMenuClick = (itemId: string) => {
    setStayOpen(true);
    onSelectMenu(itemId);
  };

  const handleToggleButtonClick = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    if (nextCollapsed) {
      setStayOpen(false);
      clearCollapseTimer();
    } else {
      setStayOpen(true);
      if (!isHovered) {
        startCollapseTimer();
      }
    }
  };

  React.useEffect(() => {
    return () => clearCollapseTimer();
  }, [clearCollapseTimer]);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setIsCollapsed(true);
      setStayOpen(false);
    }
  }, []);

  React.useEffect(() => {
    const handleCollapse = () => {
      setIsCollapsed(true);
      setStayOpen(false);
    };
    window.addEventListener("collapse-sidepanel", handleCollapse);
    return () => {
      window.removeEventListener("collapse-sidepanel", handleCollapse);
    };
  }, []);

  const pagesAccess = profile?.pages_access || [];
  const isAdmin = profile?.role === "Administrator";
  const isManager = profile?.role === "Manager";

  // Filter items in menuConfig based on access permissions
  const visibleMenuItems = menuConfig.filter((item) => {
    if (item.id === "Administrator") {
      return isAdmin;
    }
    if (isAdmin || isManager) return true; // Administrator and Manager see all standard pages
    return pagesAccess.includes(item.id);
  });

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`side-panel relative flex h-screen flex-col justify-between bg-[#F0F4F9] p-6 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] select-none transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? "w-[72px] px-3" : "w-64"}`}
    >
      <div className="flex flex-col gap-8">
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
              "transition-all duration-300 ease-in-out origin-left whitespace-nowrap",
              isCollapsed ? "opacity-0 scale-95 pointer-events-none max-w-0 overflow-hidden" : "opacity-100 scale-100 max-w-[200px]"
            )}
          >
            <h1 className="font-primary text-2xl font-bold tracking-tight text-zinc-950">
              iB HSG Global
            </h1>
            <p className="font-primary text-xs leading-normal font-medium text-zinc-500 whitespace-nowrap">
              Connecting Teams. Bridging Operations.
            </p>
          </div>
        </div>

        {/* Menu Items Section */}
        <nav className="flex flex-col gap-1.5">
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
              isCollapsed ? "opacity-0 scale-95 pointer-events-none max-w-0 overflow-hidden" : "opacity-100 scale-100 max-w-[200px]"
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
