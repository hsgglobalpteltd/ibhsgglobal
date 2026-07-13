"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
}

export function FeatureCard({ className, title, description, ...props }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group relative aspect-[4/3] w-full max-w-[250px] bg-white hover:bg-[#D3E3FD] border border-slate-200 rounded-lg flex items-center justify-center p-6 transition-all duration-300 shadow-xs hover:shadow-md hover:scale-[1.03] cursor-pointer select-none",
        className
      )}
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
