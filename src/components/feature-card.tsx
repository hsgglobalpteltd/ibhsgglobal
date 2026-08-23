"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { isLocalhostEnvironment } from "@/lib/maintenance";
import { Wrench, ArrowUpRight } from "lucide-react";

interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  isUnderMaintenance?: boolean;
  onDevAccess?: () => void;
}

export function FeatureCard({
  className,
  title,
  description,
  isUnderMaintenance = false,
  onDevAccess,
  onClick,
  ...props
}: FeatureCardProps) {
  const [isLocalhost, setIsLocalhost] = React.useState(false);

  React.useEffect(() => {
    setIsLocalhost(isLocalhostEnvironment());
  }, []);

  if (isUnderMaintenance) {
    return (
      <div
        className={cn(
          "group relative aspect-[4/3] w-full max-w-[250px] bg-white border border-slate-200 rounded-lg flex items-center justify-center p-4 transition-all duration-300 shadow-xs cursor-not-allowed select-none opacity-50",
          className
        )}
        title="This module is under construction"
        {...props}
      >
        {/* Small top-right icon only */}
        <div className="absolute top-2.5 right-2.5 text-zinc-400" title="Under Construction">
          <Wrench size={13} />
        </div>

        {/* Title */}
        <span className="font-primary text-sm font-bold text-zinc-500 text-center px-4">
          {title}
        </span>

        {/* Localhost Dev Bypass Button: Bottom right corner, icon only */}
        {isLocalhost && onDevAccess && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDevAccess();
            }}
            className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded bg-[#0B57D0] hover:bg-[#0842A0] active:scale-95 text-white flex items-center justify-center shadow-xs hover:shadow transition-all cursor-pointer pointer-events-auto z-10"
            title="Dev Access"
          >
            <ArrowUpRight size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative aspect-[4/3] w-full max-w-[250px] bg-white hover:bg-[#D3E3FD] border border-slate-200 rounded-lg flex items-center justify-center p-6 transition-all duration-300 shadow-xs hover:shadow-md hover:scale-[1.03] cursor-pointer select-none",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* Title State (default visible, hover hidden) */}
      <span className="font-primary text-sm font-bold text-zinc-800 transition-all duration-300 group-hover:opacity-0 group-hover:scale-90 text-center px-4 absolute pointer-events-none">
        {title}
      </span>

      {/* Description State (default hidden, hover visible) */}
      <span className="font-primary text-xs leading-relaxed font-semibold text-[#041E49] transition-all duration-300 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 text-center px-5 absolute pointer-events-none">
        {description}
      </span>
    </div>
  );
}
