"use client";

import * as React from "react";
import { Sparkles, Clock } from "lucide-react";

interface FeatureComingSoonProps {
  title: string;
}

export function FeatureComingSoon({ title }: FeatureComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50dvh] w-full px-4 font-primary animate-tableFadeInOnly">
      <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-10 shadow-xl flex flex-col items-center text-center overflow-hidden">
        {/* Soft Background Radial Gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Dynamic Glowing Icon Container */}
        <div className="relative mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E8F0FE] to-[#D2E3FC] text-[#0B57D0] shadow-inner">
          <Clock size={28} className="stroke-[2] animate-pulse" />
          <div className="absolute -top-1.5 -right-1.5 p-1 rounded-lg bg-amber-100 text-amber-600 shadow-sm">
            <Sparkles size={12} className="fill-amber-400 stroke-amber-500" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-black text-zinc-950 tracking-tight leading-none mb-3">
          {title}
        </h2>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
          Under Active Development
        </div>

        <p className="text-sm text-zinc-500 leading-relaxed max-w-sm mb-8 font-medium">
          We are currently crafting this workspace module with a state-of-the-art interface and database integrations. It will be available in an upcoming update.
        </p>

        {/* Subtle decorative separator */}
        <div className="w-12 h-[1px] bg-slate-200/80" />
      </div>
    </div>
  );
}
