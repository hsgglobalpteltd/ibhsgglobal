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
          "flex items-center rounded py-2.5 text-sm font-medium transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] font-primary select-none outline-none group",
          "hover:scale-[1.05] active:scale-[0.96]",
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
        {icon && (
          <span 
            className={cn(
              "flex-shrink-0 transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-115", 
              isActive ? "text-[#041E49]" : "text-zinc-500 group-hover:text-[#041E49]"
            )}
          >
            {icon}
          </span>
        )}
        <span 
          className={cn(
            "truncate transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] origin-left whitespace-nowrap group-hover:translate-x-1",
            isCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[200px] opacity-100"
          )}
        >
          {label}
        </span>
      </button>
    );
  }
);

MenuButton.displayName = "MenuButton";
