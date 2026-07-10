"use client";

import * as React from "react";
import { FeatureCard } from "../feature-card";
import { AssetLibraryModule } from "../modules/AssetLibraryModule";
import { TikTokStoryboardBriefsModule } from "../modules/TikTokStoryboardBriefsModule";
import { MarketingCalendarModule } from "../modules/MarketingCalendarModule";
import { APP_PAGES_CONFIG } from "@/config/modules-config";

interface MarketingContentPageProps {
  profile?: {
    role: string;
    modules_access: string[];
  } | null;
  idToken?: string;
}

export function MarketingContentPage({ profile, idToken }: MarketingContentPageProps) {
  const [activeSubModule, setActiveSubModule] = React.useState<string | null>(null);

  const subModules = React.useMemo(() => {
    return APP_PAGES_CONFIG.find((p) => p.id === "Marketing & Content")?.modules || [];
  }, []);

  const modulesAccess = profile?.modules_access || [];
  const isAdmin = profile?.role === "Administrator";
  const isManager = profile?.role === "Manager";

  // Filter modules based on user access
  const visibleModules = subModules.filter(
    (mod) => isAdmin || modulesAccess.includes(mod.title)
  );

  // Set initial breadcrumb on mount
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Marketing & Content"] }));
  }, []);

  // Listen to window breadcrumb-back event to reset views
  React.useEffect(() => {
    const handleBreadcrumbBack = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      const path = customEvent.detail;
      if (path && path.length === 1 && path[0] === "Marketing & Content") {
        setActiveSubModule(null);
      }
    };
    window.addEventListener("breadcrumb-back", handleBreadcrumbBack);
    return () => {
      window.removeEventListener("breadcrumb-back", handleBreadcrumbBack);
    };
  }, []);

  const handleSubModuleSelect = (title: string) => {
    setActiveSubModule(title);
    window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Marketing & Content", title] }));
  };

  const renderActiveSubModule = () => {
    switch (activeSubModule) {
      case "Asset Library":
        return <AssetLibraryModule profile={profile} idToken={idToken} />;
      case "TikTok & Storyboard Briefs":
        return <TikTokStoryboardBriefsModule />;
      case "Marketing Calendar":
        return <MarketingCalendarModule />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px]">
      {!activeSubModule && (
        <div className="content-header flex flex-col gap-1 px-1 border-b border-zinc-300/40 pb-4">
          <h2 className="font-primary text-2xl font-bold text-zinc-950">
            Marketing & Content
          </h2>
          <p className="font-primary text-sm text-zinc-500">
            Central creative registry and content tracker. Select a module below to launch.
          </p>
        </div>
      )}

      {activeSubModule ? (
        renderActiveSubModule()
      ) : (
        <div className="content-body flex-1 w-full overflow-y-auto">
          {visibleModules.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-[#F0F4F9] border border-dashed border-slate-200 rounded select-none">
              <span className="font-primary text-sm text-zinc-500 italic">
                No modules assigned. Please contact your administrator.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 mt-2">
              {visibleModules.map((mod) => (
                <FeatureCard
                  key={mod.title}
                  title={mod.title}
                  description={mod.description}
                  onClick={() => handleSubModuleSelect(mod.title)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
