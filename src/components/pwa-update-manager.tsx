"use client";

import * as React from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";

export function PwaUpdateManager() {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const initialBuildIdRef = React.useRef<string | null>(null);

  // 1. Service Worker Update Detection & Periodic Polling
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registrationRef: ServiceWorkerRegistration | null = null;

    const onUpdateFound = (reg: ServiceWorkerRegistration) => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New version is installed and waiting to activate
          setWaitingWorker(newWorker);
          setUpdateAvailable(true);
        }
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registrationRef = registration;

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        registration.addEventListener("updatefound", () => {
          onUpdateFound(registration);
        });

        // Polling: check for SW updates every 60 seconds
        const pollInterval = setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);

        return () => clearInterval(pollInterval);
      })
      .catch((err) => {
        console.warn("Service worker registration error:", err);
      });

    // Also trigger update check when user focuses window or returns to tab
    const handleFocus = () => {
      if (registrationRef) {
        registrationRef.update().catch(() => {});
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // Listen for controlling service worker change to auto reload
    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // 2. Client Build Version Heartbeat (Detects Next.js redeployments)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const checkBuildVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.version) return;

        const serverVersion = String(data.version);
        if (!initialBuildIdRef.current) {
          initialBuildIdRef.current = serverVersion;
        } else if (initialBuildIdRef.current !== serverVersion) {
          // Server was updated/redeployed with a new build timestamp
          setUpdateAvailable(true);
        }
      } catch {}
    };

    checkBuildVersion();
    const interval = setInterval(checkBuildVersion, 60 * 1000);
    window.addEventListener("focus", checkBuildVersion);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkBuildVersion);
    };
  }, []);

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300 select-none">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-4 flex items-center justify-between gap-3 text-zinc-900 font-primary">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#D3E3FD] text-[#0B57D0] flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-950">System Update Ready</span>
            <span className="text-[11px] text-zinc-500 font-medium leading-tight">
              A newer version of iB has been deployed.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isUpdating ? "animate-spin" : ""} />
            <span>{isUpdating ? "Updating..." : "Update"}</span>
          </button>
          <button
            type="button"
            onClick={() => setUpdateAvailable(false)}
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
