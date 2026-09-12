"use client";

import * as React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

const OFFLINE_DELAY_MS = 4000; // 4-second delay before displaying offline screen

export function NetworkGuard({ children }: { children?: React.ReactNode }) {
  const [isOffline, setIsOffline] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const offlineTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper to test genuine network connectivity
  const verifyConnectivity = React.useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator.onLine) return false;
    try {
      // Fast heartbeat fetch to check if the network is truly reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }, []);

  const triggerOfflineCheck = React.useCallback(() => {
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
    }

    // Wait for the delay (jeda) to ensure it's not a brief glitch or poor connection
    offlineTimerRef.current = setTimeout(async () => {
      const isOnline = await verifyConnectivity();
      if (!isOnline) {
        setIsOffline(true);
      }
    }, OFFLINE_DELAY_MS);
  }, [verifyConnectivity]);

  const triggerOnlineCheck = React.useCallback(async () => {
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    const isOnline = await verifyConnectivity();
    if (isOnline) {
      setIsOffline(false);
    }
  }, [verifyConnectivity]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial check on mount
    if (!navigator.onLine) {
      triggerOfflineCheck();
    }

    const handleOffline = () => {
      triggerOfflineCheck();
    };

    const handleOnline = () => {
      triggerOnlineCheck();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Periodic heartbeat every 15s to catch silent disconnections
    const heartbeat = setInterval(async () => {
      if (!navigator.onLine) {
        triggerOfflineCheck();
      } else if (isOffline) {
        const online = await verifyConnectivity();
        if (online) {
          setIsOffline(false);
        }
      }
    }, 15000);

    return () => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearInterval(heartbeat);
    };
  }, [isOffline, triggerOfflineCheck, triggerOnlineCheck, verifyConnectivity]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      const isOnline = await verifyConnectivity();
      if (isOnline) {
        setIsOffline(false);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      try {
        window.close();
      } catch {}
    }
  };

  return (
    <>
      {children}

      {/* Full-screen pure white offline screen */}
      {isOffline && (
        <div className="fixed inset-0 z-[9999999] bg-white flex flex-col items-center justify-center p-6 text-center select-none font-primary animate-in fade-in duration-300">
          <div className="flex flex-col items-center max-w-sm w-full">
            {/* Offline Icon */}
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center mb-5 shadow-xs">
              <WifiOff size={28} />
            </div>

            {/* Title & Message */}
            <h2 className="text-xl font-bold text-zinc-950 mb-2">
              No Internet Connection
            </h2>
            <p className="text-xs text-zinc-600 leading-relaxed mb-6 font-normal">
              Please check your connection or close the application.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={handleManualRetry}
                disabled={isRetrying}
                className="w-full sm:w-auto h-9 px-5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRetrying ? "animate-spin" : ""} />
                <span>{isRetrying ? "Checking..." : "Retry Connection"}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto h-9 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 active:scale-98 text-zinc-700 text-xs font-medium transition-all cursor-pointer"
              >
                Close Application
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
