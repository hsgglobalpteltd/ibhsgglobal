"use client";

import * as React from "react";
import { FeatureCard } from "../feature-card";
import { SnapDealsModule } from "../modules/SnapDealsModule";
import { StoresVisibilityModule } from "../modules/StoresVisibilityModule";
import { SponsorshipModule } from "../modules/SponsorshipModule";
import { DirectOrderModule } from "../modules/DirectOrderModule";
import { CustomerServiceModule } from "../modules/CustomerServiceModule";
import { APP_PAGES_CONFIG } from "@/config/modules-config";
import { canViewModule } from "@/lib/permissions";
import { UserProfile } from "@/lib/api";
import { useMaintenanceSettings } from "@/lib/maintenance";

interface SalesChannelsPageProps {
  profile?: UserProfile | null;
  breadcrumbPath?: string[];
}

export function SalesChannelsPage({ profile, breadcrumbPath }: SalesChannelsPageProps) {
  const [activeSubModule, setActiveSubModule] = React.useState<string | null>(null);
  const { settings } = useMaintenanceSettings();

  React.useEffect(() => {
    if (breadcrumbPath && breadcrumbPath.length > 1 && breadcrumbPath[0] === "Sales & Channels") {
      setActiveSubModule(breadcrumbPath[1]);
    }
  }, [breadcrumbPath]);

  const subModules = React.useMemo(() => {
    return APP_PAGES_CONFIG.find((p) => p.id === "Sales & Channels")?.modules || [];
  }, []);

  // Filter modules based on user view permission
  const visibleModules = subModules.filter(
    (mod) => canViewModule(profile, mod.title)
  );

  // Set initial breadcrumb on mount
  React.useEffect(() => {
    if (!activeSubModule) {
      window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Sales & Channels"] }));
    }
  }, [activeSubModule]);

  // Listen to window breadcrumb-back event to reset views
  React.useEffect(() => {
    const handleBreadcrumbBack = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      const path = customEvent.detail;
      if (path && path.length === 1 && path[0] === "Sales & Channels") {
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
    window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Sales & Channels", title] }));
    window.dispatchEvent(new CustomEvent("collapse-sidepanel"));
  };

  const renderActiveSubModule = () => {
    switch (activeSubModule) {
      case "Snap Deals":
        return <SnapDealsModule profile={profile} />;
      case "Stores Visibility":
        return <StoresVisibilityModule profile={profile} />;
      case "Sponsorship":
        return <SponsorshipModule profile={profile} />;
      case "Direct Order":
        return <DirectOrderModule profile={profile} />;
      case "Customer Service":
        return <CustomerServiceModule profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px]">
      {!activeSubModule && (
        <div className="content-header flex flex-col gap-1 px-1 border-b border-zinc-300/40 pb-4">
          <h2 className="font-primary text-2xl font-bold text-zinc-950">
            Sales & Channels Portal
          </h2>
          <p className="font-primary text-sm text-zinc-500">
            Central campaign router and order manager. Select a module below to launch.
          </p>
        </div>
      )}

      {activeSubModule ? (
        renderActiveSubModule()
      ) : (
        <div className="content-body flex-1 w-full overflow-y-auto p-2">
          {visibleModules.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-[#F0F4F9] border border-dashed border-slate-200 rounded select-none">
              <span className="font-primary text-sm text-zinc-500 italic">
                No modules assigned. Please contact your administrator.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 mt-2">
              {visibleModules.map((mod) => {
                const isUnderMaintenance = !!settings.moduleMaintenance[mod.title];
                return (
                  <FeatureCard
                    key={mod.title}
                    title={mod.title}
                    description={mod.description}
                    isUnderMaintenance={isUnderMaintenance}
                    onClick={() => !isUnderMaintenance && handleSubModuleSelect(mod.title)}
                    onDevAccess={() => handleSubModuleSelect(mod.title)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
