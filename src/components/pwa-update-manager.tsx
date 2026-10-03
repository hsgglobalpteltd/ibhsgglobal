"use client";

import * as React from "react";
import { RefreshCw, X } from "lucide-react";

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/25 backdrop-blur-[2px] p-4 animate-in fade-in duration-200 select-none">
      <div className="relative bg-white border border-slate-200 rounded-xl shadow-2xl p-5 max-w-sm w-full flex flex-col items-center text-center gap-3 text-zinc-900 font-primary animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => setUpdateAvailable(false)}
          className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X size={15} />
        </button>

        <div className="flex flex-col items-center pt-1">
          <span className="text-sm font-semibold text-zinc-900">System Update Ready</span>
          <span className="text-xs text-zinc-500 mt-1">
            A newer version of iB has been deployed.
          </span>
        </div>

        <button
          type="button"
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="mt-1 h-8.5 px-6 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] active:scale-95 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={isUpdating ? "animate-spin" : ""} />
          <span>{isUpdating ? "Updating..." : "Update Now"}</span>
        </button>
      </div>
    </div>
  );
}
