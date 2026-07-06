"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  isActive?: boolean;
  icon?: React.ReactNode;
  isCollapsed?: boolean;
}

export const MenuButton = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ className, label, isActive, icon, isCollapsed = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center rounded py-2.5 text-sm font-medium transition-all duration-200 ease-in-out font-primary select-none outline-none",
          isCollapsed ? "w-12 h-12 justify-center mx-auto px-0" : "w-full gap-3 px-5 text-left",
          "text-[#474747] hover:text-[#1F1F1F] focus-visible:text-[#1F1F1F]",
          "hover:bg-[#E0E8F6]",
          "focus-visible:bg-[#E0E8F6] focus-visible:ring-2 focus-visible:ring-blue-400/20",
          isActive && "bg-[#D3E3FD] text-[#041E49] shadow-xs font-bold",
          className
        )}
        title={isCollapsed ? label : undefined}
        {...props}
      >
        {icon && <span className={cn("flex-shrink-0 transition-colors", isActive ? "text-[#041E49]" : "text-zinc-500 group-hover:text-zinc-900")}>{icon}</span>}
        {!isCollapsed && <span className="truncate">{label}</span>}
      </button>
    );
  }
);

MenuButton.displayName = "MenuButton";
