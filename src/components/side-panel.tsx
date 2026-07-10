"use client";

import * as React from "react";
import { MenuButton } from "./menu-button";
import { ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import { menuConfig } from "@/config/menu-config";

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
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
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
    <aside className={`side-panel relative flex h-screen flex-col justify-between bg-[#F0F4F9] p-6 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] select-none transition-all duration-300 ease-in-out ${isCollapsed ? "w-20 px-3" : "w-72"}`}>
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className={`flex flex-col gap-1.5 ${isCollapsed ? "items-center px-0" : "px-2"}`}>
          {isCollapsed ? (
            <h1 className="font-primary text-xl font-bold tracking-tight text-zinc-950 bg-[#EEEEEE]/40 w-10 h-10 flex items-center justify-center rounded-lg shadow-sm">
              iB
            </h1>
          ) : (
            <>
              <h1 className="font-primary text-2xl font-bold tracking-tight text-zinc-950">
                iB HSG Global
              </h1>
              <p className="font-primary text-xs leading-normal font-medium text-zinc-500">
                Connecting Teams. Bridging Operations.
              </p>
            </>
          )}
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
              onClick={() => onSelectMenu(item.id)}
            />
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-4">
        {/* User Profile Section */}
        <div className={`flex flex-col border-t border-zinc-300/40 pt-4 ${isCollapsed ? "items-center px-0" : "px-2"}`}>
          {isCollapsed ? (
            <button 
              onClick={onLogout}
              className="flex w-10 h-10 items-center justify-center rounded text-zinc-600 hover:text-zinc-950 hover:bg-[#EEEEEE] transition-all duration-200 shadow-sm cursor-pointer"
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <div className="flex flex-col gap-2 w-full text-left px-2">
              <div className="flex flex-col truncate">
                <span className="font-primary text-sm font-semibold text-zinc-800 truncate">
                  {profile?.name || user?.displayName || "Google User"}
                </span>
                <span className="font-primary text-[10px] text-zinc-500 truncate">
                  {user?.email || ""}
                </span>
              </div>
              <button 
                onClick={onLogout}
                className="text-left text-xs text-zinc-600 hover:text-zinc-950 font-primary font-medium hover:underline focus-visible:outline-none w-fit cursor-pointer mt-0.5"
              >
                Log Out
              </button>
            </div>
          )}
        </div>

        {/* Footer Section using font-footer */}
        {!isCollapsed && (
          <div className="px-2 pt-2 border-t border-zinc-300/20">
            <p className="font-footer text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
              Internal Bridge
            </p>
            <p className="font-footer text-[9px] text-zinc-400 mt-0.5">
              © 2026 HSG Global. All rights reserved.
            </p>
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute bottom-[10%] right-0 translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 bg-[#EEEEEE] text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 z-10 cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
