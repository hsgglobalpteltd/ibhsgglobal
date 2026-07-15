"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkStandalone = () => {
        const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches 
          || (window.navigator as any).standalone 
          || document.referrer.includes("android-app://");
        setIsStandalone(!!isStandaloneMode);
      };

      checkStandalone();

      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent browser's default install prompt showing immediately
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      const handleAppInstalled = () => {
        setInstallPrompt(null);
        setIsInstallable(false);
        setIsStandalone(true);
        console.log("PWA was installed successfully");
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      const mediaQuery = window.matchMedia("(display-mode: standalone)");
      const handleMediaChange = (e: MediaQueryListEvent) => {
        setIsStandalone(e.matches);
      };
      
      mediaQuery.addEventListener("change", handleMediaChange);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
        mediaQuery.removeEventListener("change", handleMediaChange);
      };
    }
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstallPrompt(null);
        setIsInstallable(false);
      }
    } catch (err) {
      console.error("Error triggering PWA install prompt:", err);
    }
  };

  return { isInstallable, isStandalone, installApp };
}
