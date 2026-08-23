"use client";

import * as React from "react";
import { Download, Monitor, Maximize, RefreshCw, X, Lightbulb } from "lucide-react";
import { usePWA } from "@/lib/usePWA";
import { CustomButton } from "./custom-button";

const STORAGE_KEY = "pwa_install_dismissed_until";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function PwaInstallModal() {
  const { isInstallable, isStandalone, installApp } = usePWA();
  const [isOpen, setIsOpen] = React.useState(false);

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
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isStandalone]);

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + DISMISS_DURATION_MS));
    setIsOpen(false);
  };

  const handleInstall = async () => {
    try {
      await installApp();
    } finally {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs select-none font-primary animate-fade-in">
      <div className="w-full max-w-md bg-[#E5E5E5] border border-zinc-300 rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-300 bg-[#EEEEEE]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 rounded-lg text-white">
              <Monitor size={18} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-zinc-950">Install Desktop Application</h3>
              <p className="text-[11px] text-zinc-500 font-medium">Your PC can install this directly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-300/40 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs text-zinc-650 leading-relaxed font-medium">
            Install the <strong>iB HSG Global</strong> application to your PC for faster loading, native desktop window experience, and one-click access.
          </p>

          {/* Quick Tips Container */}
          <div className="flex flex-col gap-2.5 bg-[#EEEEEE] border border-zinc-300/80 rounded-lg p-3.5">
            <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs">
              <Lightbulb size={14} className="text-amber-500 stroke-[2.5]" />
              <span>Workspace Tips</span>
            </div>
            
            <div className="flex flex-col gap-2 text-[11px] text-zinc-600">
              <div className="flex items-start gap-2">
                <span className="p-1 bg-zinc-200 rounded text-zinc-700 mt-0.5">
                  <Maximize size={11} />
                </span>
                <span className="leading-tight">
                  Click the <strong>Fullscreen</strong> icon on the top right header to expand to full screen.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="p-1 bg-zinc-200 rounded text-zinc-700 mt-0.5">
                  <RefreshCw size={11} />
                </span>
                <span className="leading-tight">
                  Click the <strong>Refresh</strong> icon on the top right header to sync live database records anytime.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-zinc-300 bg-[#EEEEEE]">
          <CustomButton
            type="button"
            variant="default"
            onClick={handleSkip}
            className="h-8 px-4 text-xs font-semibold"
          >
            Skip
          </CustomButton>
          <CustomButton
            type="button"
            variant="dark"
            onClick={handleInstall}
            className="h-8 px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Install</span>
          </CustomButton>
        </div>

      </div>
    </div>
  );
}
