"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import { usePWA } from "@/lib/usePWA";

const STORAGE_KEY = "pwa_install_dismissed_until";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function PwaInstallModal() {
  const { isInstallable, isStandalone, installApp } = usePWA();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode already
    if (isStandalone) {
      setIsOpen(false);
      return;
    }

    // Check 24-hour dismissal cache
    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      setIsOpen(false);
      return;
    }

    // Show popup if installable
    if (isInstallable) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isStandalone]);

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + DISMISS_DURATION_MS));
    setIsOpen(false);
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99998] max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300 select-none">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-4 flex items-center justify-between gap-3 text-zinc-900 font-primary">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#D3E3FD] text-[#0B57D0] flex items-center justify-center shrink-0">
            <Download size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-950">Install Desktop App</span>
            <span className="text-[11px] text-zinc-500 font-medium leading-tight">
              One-click access &amp; native window.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            disabled={isInstalling}
            className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={12} />
            <span>{isInstalling ? "Installing..." : "Install"}</span>
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
