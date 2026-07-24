"use client";

import * as React from "react";
import { FeatureCard } from "../feature-card";
import { PromoterModule } from "../modules/PromoterModule";
import { MerchandiserModule } from "../modules/MerchandiserModule";
import { TaskModule } from "../modules/TaskModule";
import { TrackOrderModule } from "../modules/TrackOrderModule";
import { TiktokFulfillmentModule } from "../modules/TiktokFulfillmentModule";
import { APP_PAGES_CONFIG } from "@/config/modules-config";

interface FrontlinePageProps {
  profile?: {
    role: string;
    modules_access: string[];
    name?: string;
    email?: string;
  } | null;
  breadcrumbPath?: string[];
}

import { ConfirmDialog } from "../confirm-dialog";

export function FrontlinePage({ profile, breadcrumbPath }: FrontlinePageProps) {
  const [activeSubModule, setActiveSubModule] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (breadcrumbPath && breadcrumbPath.length > 1 && breadcrumbPath[0] === "Frontline") {
      setActiveSubModule(breadcrumbPath[1]);
    }
  }, [breadcrumbPath]);
  
  const [confirmOpen, setConfirmOpen] = React.useState<boolean>(false);
  const [pendingSubModule, setPendingSubModule] = React.useState<string | null>(null);
  const [pendingBack, setPendingBack] = React.useState<boolean>(false);

  const subModules = React.useMemo(() => {
    return APP_PAGES_CONFIG.find((p) => p.id === "Frontline")?.modules || [];
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
    if (!activeSubModule) {
      window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Frontline"] }));
    }
  }, [activeSubModule]);

  const handlePendingConfirm = () => {
    localStorage.removeItem("ib_promoter_schedules_draft");
    localStorage.removeItem("ib_promoter_schedules_backup");
    window.dispatchEvent(new CustomEvent("ib-clear-edit-mode"));

    if (pendingSubModule) {
      setActiveSubModule(pendingSubModule);
      window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Frontline", pendingSubModule] }));
      window.dispatchEvent(new CustomEvent("collapse-sidepanel"));
    } else if (pendingBack) {
      setActiveSubModule(null);
    }
    
    setPendingSubModule(null);
    setPendingBack(false);
    setConfirmOpen(false);
  };

  const handlePendingCancel = () => {
    setPendingSubModule(null);
    setPendingBack(false);
    setConfirmOpen(false);
  };

  // Listen to window breadcrumb-back event to reset views
  React.useEffect(() => {
    const handleBreadcrumbBack = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      const path = customEvent.detail;
      if (path && path.length === 1 && path[0] === "Frontline") {
        const draft = localStorage.getItem("ib_promoter_schedules_draft");
        if (draft) {
          setPendingBack(true);
          setConfirmOpen(true);
        } else {
          setActiveSubModule(null);
        }
      }
    };
    window.addEventListener("breadcrumb-back", handleBreadcrumbBack);
    return () => {
      window.removeEventListener("breadcrumb-back", handleBreadcrumbBack);
    };
  }, []);

  const handleSubModuleSelect = (title: string) => {
    const draft = localStorage.getItem("ib_promoter_schedules_draft");
    if (draft) {
      setPendingSubModule(title);
      setConfirmOpen(true);
    } else {
      setActiveSubModule(title);
      window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Frontline", title] }));
      window.dispatchEvent(new CustomEvent("collapse-sidepanel"));
    }
  };

  const renderActiveSubModule = () => {
    switch (activeSubModule) {
      case "Promoter":
        return <PromoterModule profile={profile} />;
      case "Merchandiser":
        return <MerchandiserModule profile={profile} />;
      case "Task":
        return <TaskModule profile={profile} />;
      case "Track Order":
        return <TrackOrderModule profile={profile} />;
      case "Tiktok Fulfillment":
        return <TiktokFulfillmentModule profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0">
      {!activeSubModule && (
        <div className="content-header flex flex-col gap-1 px-1 border-b border-zinc-300/40 pb-4">
          <h2 className="font-primary text-2xl font-bold text-zinc-950">
            Frontline Management
          </h2>
          <p className="font-primary text-sm text-zinc-500">
            Field operations tracker and coordinator. Select a module below to launch.
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
      {/* Unsaved changes confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Unsaved Changes"
        description="You have unsaved schedule changes. Do you want to continue without saving?"
        variant="danger"
        confirmText="Continue without saving"
        cancelText="Cancel"
        onConfirm={handlePendingConfirm}
        onCancel={handlePendingCancel}
      />
    </div>
  );
}
