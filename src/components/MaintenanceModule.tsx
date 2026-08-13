"use client";

import * as React from "react";
import { Wrench } from "lucide-react";

interface MaintenanceModuleProps {
  title: string;
}

export function MaintenanceModule({ title }: MaintenanceModuleProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50dvh] w-full px-4 font-primary animate-tableFadeInOnly">
      <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-10 shadow-xl flex flex-col items-center text-center overflow-hidden">
        {/* Soft Background Radial Gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Dynamic Glowing Icon Container */}
        <div className="relative mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FEF3C7] to-[#FDE68A] text-[#D97706] shadow-inner">
          <Wrench size={28} className="stroke-[2] animate-bounce" />
        </div>

        {/* Content */}
        <h2 className="text-2xl font-black text-zinc-950 tracking-tight leading-none mb-3">
          {title} Module
        </h2>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
          Module in Maintenance
        </div>

        <p className="text-sm text-zinc-500 leading-relaxed max-w-sm mb-8 font-medium">
          This module is currently undergoing scheduled database maintenance and migrations. It will be reconnected shortly.
        </p>

        {/* Subtle decorative separator */}
        <div className="w-12 h-[1px] bg-slate-200/80" />
      </div>
    </div>
  );
}
