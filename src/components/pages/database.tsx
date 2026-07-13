"use client";

import * as React from "react";
import { FeatureCard } from "../feature-card";
import { ProductsDatabaseModule } from "../modules/ProductsDatabaseModule";
import { StoresDatabaseModule } from "../modules/StoresDatabaseModule";
import { RetailerSkusModule } from "../modules/RetailerSkusModule";
import { APP_PAGES_CONFIG } from "@/config/modules-config";

interface DatabasePageProps {
  profile?: {
    role: string;
    modules_access: string[];
  } | null;
}

export function DatabasePage({ profile }: DatabasePageProps) {
  const [activeSubDb, setActiveSubDb] = React.useState<string | null>(null);

  const subDbs = React.useMemo(() => {
    return APP_PAGES_CONFIG.find((p) => p.id === "Database")?.modules || [];
  }, []);

  const modulesAccess = profile?.modules_access || [];
  const isAdmin = profile?.role === "Administrator";
  const isManager = profile?.role === "Manager";

  // Filter modules based on user access
  const visibleModules = subDbs.filter(
    (mod) => isAdmin || modulesAccess.includes(mod.title)
  );

  // Set initial breadcrumb on mount
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Database"] }));
  }, []);

  // Listen to window breadcrumb-back event to reset views
  React.useEffect(() => {
    const handleBreadcrumbBack = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      const path = customEvent.detail;
      if (path && path.length === 1 && path[0] === "Database") {
        setActiveSubDb(null);
      }
    };
    window.addEventListener("breadcrumb-back", handleBreadcrumbBack);
    return () => {
      window.removeEventListener("breadcrumb-back", handleBreadcrumbBack);
    };
  }, []);

  const handleSubDbSelect = (title: string) => {
    setActiveSubDb(title);
    window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Database", title] }));
    window.dispatchEvent(new CustomEvent("collapse-sidepanel"));
  };

  const renderActiveSubModule = () => {
    switch (activeSubDb) {
      case "Products Database":
        return <ProductsDatabaseModule profile={profile} />;
      case "Stores Database":
        return <StoresDatabaseModule profile={profile} />;
      case "Retailer SKU's":
        return <RetailerSkusModule profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px]">
      {!activeSubDb && (
        <div className="content-header flex flex-col gap-1 px-1 border-b border-zinc-300/40 pb-4">
          <h2 className="font-primary text-2xl font-bold text-zinc-950">
            Database Portal
          </h2>
          <p className="font-primary text-sm text-zinc-500">
            Direct replication bridge and registry manager. Select a database catalogue category to access.
          </p>
        </div>
      )}

      {activeSubDb ? (
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
              {visibleModules.map((db) => (
                <FeatureCard
                  key={db.title}
                  title={db.title}
                  description={db.description}
                  onClick={() => handleSubDbSelect(db.title)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
