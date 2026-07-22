"use client";

import * as React from "react";
import { FeatureCard } from "../feature-card";
import { TenantModule } from "../modules/TenantModule";
import { SiteModule } from "../modules/SiteModule";
import { StoreMapConfigModule } from "../modules/StoreMapConfigModule";
import { APP_PAGES_CONFIG } from "@/config/modules-config";

interface WebsitePageProps {
  profile?: {
    email: string;
    role: string;
    modules_access: string[];
  } | null;
  idToken?: string;
}

export function WebsitePage({ profile, idToken }: WebsitePageProps) {
  const [activeSubModule, setActiveSubModule] = React.useState<string | null>(null);

  const subModules = React.useMemo(() => {
    return APP_PAGES_CONFIG.find((p) => p.id === "Website")?.modules || [];
  }, []);

  // Set initial breadcrumb on mount
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Website"] }));
  }, []);

  // Listen to window breadcrumb-back event to reset views
  React.useEffect(() => {
    const handleBreadcrumbBack = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      const path = customEvent.detail;
      if (path && path.length === 1 && path[0] === "Website") {
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
    window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Website", title] }));
    window.dispatchEvent(new CustomEvent("collapse-sidepanel"));
  };

  const renderActiveSubModule = () => {
    switch (activeSubModule) {
      case "Portal Users":
        return <TenantModule idToken={idToken} profile={profile} />;
      case "Site":
        return <SiteModule idToken={idToken} profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px]">
      {activeSubModule !== "Portal Users" && activeSubModule !== "Site" && (
        <div className="content-header flex flex-col gap-1 px-1 border-b border-zinc-300/40 pb-4">
          <h2 className="font-primary text-2xl font-bold text-zinc-955">
            {activeSubModule ? `Website / ${activeSubModule}` : "Website Portal Management"}
          </h2>
          <p className="font-primary text-sm text-zinc-500">
            {activeSubModule 
              ? `Active workspace interface. Use the floating [✕] button on the TopBar to exit.` 
              : "System domain registration, user portal bindings, and workspace allocations. Select a module below to launch."}
          </p>
        </div>
      )}

      {activeSubModule ? (
        renderActiveSubModule()
      ) : (
        <div className="content-body flex-1 w-full overflow-y-auto p-2">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 mt-2">
            {subModules.map((mod) => (
              <FeatureCard
                key={mod.title}
                title={mod.title}
                description={mod.description}
                onClick={() => handleSubModuleSelect(mod.title)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
