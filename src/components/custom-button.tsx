"use client";

import * as React from "react";

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "danger" | "dark" | "ghost";
  children: React.ReactNode;
}

export function CustomButton({ variant = "default", children, className = "", ...props }: CustomButtonProps) {
  // Height is exactly h-8 (32px), Corner Radius is rounded (4px)
  const baseStyle = "h-8 px-4 text-xs font-bold rounded border shadow-xs flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer outline-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:pointer-events-none";
  
  let variantStyle = "";
  if (variant === "default") {
    // Neutral white button with thin slate border
    variantStyle = "bg-white border-slate-200 text-zinc-700 hover:text-zinc-950 hover:bg-slate-50";
  } else if (variant === "secondary") {
    // Google soft light-blue button (like "Execution log")
    variantStyle = "bg-[#E8F0FE] border-transparent text-[#0B57D0] hover:bg-[#D2E3FC] hover:text-[#0842A0] shadow-none";
  } else if (variant === "dark") {
    // Google solid primary blue button (like "Deploy")
    variantStyle = "bg-[#0B57D0] border-transparent text-white hover:bg-[#0842A0] hover:text-white";
  } else if (variant === "danger") {
    // Google soft danger/warning button (like "Reset")
    variantStyle = "bg-[#FCE8E6] border-transparent text-[#C5221F] hover:bg-[#FAD2CF] hover:text-[#B0120A] shadow-none";
  } else if (variant === "ghost") {
    // Transparent background, borderless, shadowless button
    variantStyle = "bg-transparent border-transparent text-zinc-700 hover:text-zinc-950 hover:bg-slate-50 shadow-none";
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}
