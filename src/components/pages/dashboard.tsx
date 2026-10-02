"use client";

import * as React from "react";
import { LayoutGrid, ChevronRight, BarChart3 } from "lucide-react";
import { DashboardAiSummary } from "@/components/dashboard-ai-summary";
import { DashboardAnalysisView } from "@/components/dashboard-analysis-view";

interface DashboardPageProps {
  profile?: any;
  idToken?: string;
  breadcrumbPath?: string[];
}

export function DashboardPage({ profile }: DashboardPageProps) {
  const [activeTab, setActiveTab] = React.useState<"today" | "analysis" | "forecast">("today");

  const handleTabSwitch = (tab: "today" | "analysis" | "forecast") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dashboard-tab-change", { detail: tab }));
    }
  };

  React.useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<"today" | "analysis" | "forecast">;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };

    window.addEventListener("dashboard-tab-change", handleTabChange);
    return () => {
      window.removeEventListener("dashboard-tab-change", handleTabChange);
    };
  }, []);

  // Read user profile from props or local storage fallback
  const [currentUserProfile, setCurrentUserProfile] = React.useState<any>(() => {
    if (profile) return profile;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ib_user_profile");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  const effectiveProfile = profile || currentUserProfile;

  const [userName, setUserName] = React.useState<string>(() => {
    if (effectiveProfile?.name) return effectiveProfile.name;
    if (effectiveProfile?.email) return effectiveProfile.email.split("@")[0];
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ib_user_profile");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.name) return parsed.name;
          if (parsed?.email) return parsed.email.split("@")[0];
        }
      } catch {}
    }
    return "Member";
  });

  React.useEffect(() => {
    if (profile) {
      setCurrentUserProfile(profile);
      if (profile.name) {
        setUserName(profile.name);
      } else if (profile.email) {
        setUserName(profile.email.split("@")[0]);
      }
    }
  }, [profile]);

  // Dynamic warm greeting based on time of day
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="content-body flex flex-col flex-1 h-full select-none font-primary overflow-hidden p-0">
      {/* Tab Content: Today (Combined Greeting Banner & What's Happening Today Console) */}
      {(activeTab === "today" || !activeTab) && (
        <div className="flex flex-row justify-center items-center w-full h-full min-h-0 overflow-hidden animate-in fade-in duration-300 p-3 md:p-4">
          <div className="flex flex-row gap-5 lg:gap-6 xl:gap-7 w-full max-w-[1360px] h-full max-h-[880px] min-h-0 overflow-hidden items-stretch justify-center">
            {/* Left Side: Greeting & Workspace Access */}
            <div className="w-[240px] lg:w-[260px] xl:w-[280px] shrink-0 h-full min-h-0 flex flex-col justify-center gap-5 overflow-y-auto pr-1">
              {/* Header Greeting */}
              <div className="flex flex-col items-start gap-1 shrink-0">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#0B57D0] text-white text-[11px] font-semibold shadow-2xs select-none">
                  <span>iB HSG Global</span>
                </div>

                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-950 mt-1">
                  {greeting}, <span className="text-[#0B57D0]">{userName}</span>
                </h1>

                <p className="text-xs text-zinc-500 font-normal leading-relaxed">
                  Bridging Strategy, Governance &amp; Operational Excellence
                </p>
              </div>

              {/* 2 Navigation Action Buttons */}
              <div className="flex flex-col gap-3 min-h-0">
                {/* Workspace Button */}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/workspace";
                  }}
                  className="w-full bg-white rounded-xl border border-slate-200/90 hover:border-[#0B57D0]/60 p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs hover:bg-[#F8F9FD] transition-all duration-150 cursor-pointer group text-left select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#F0F4F9] text-[#0B57D0] group-hover:bg-[#0B57D0] group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                      <LayoutGrid size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-xs font-bold text-zinc-900 group-hover:text-[#0B57D0] transition-colors leading-snug truncate">
                        Workspace
                      </h2>
                      <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                        Teamspaces, Documents &amp; Kanban
                      </span>
                    </div>
                  </div>

                  <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-zinc-400 group-hover:text-[#0B57D0] shrink-0 transition-colors">
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* Analysis Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleTabSwitch("analysis");
                  }}
                  className="w-full bg-white rounded-xl border border-slate-200/90 hover:border-[#0B57D0]/60 p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs hover:bg-[#F8F9FD] transition-all duration-150 cursor-pointer group text-left select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#F0F4F9] text-[#0B57D0] group-hover:bg-[#0B57D0] group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                      <BarChart3 size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-xs font-bold text-zinc-900 group-hover:text-[#0B57D0] transition-colors leading-snug truncate">
                        Analysis
                      </h2>
                      <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                        Sales Performance &amp; Trends
                      </span>
                    </div>
                  </div>

                  <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-zinc-400 group-hover:text-[#0B57D0] shrink-0 transition-colors">
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            </div>

            {/* Right Side: What's Happening Today Console & History */}
            <div className="flex-1 min-w-0 h-full min-h-0 overflow-hidden flex flex-col justify-center">
              <DashboardAiSummary userName={userName} profile={effectiveProfile} />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Analysis */}
      {activeTab === "analysis" && (
        <DashboardAnalysisView onBack={() => handleTabSwitch("today")} />
      )}

      {/* Tab Content: Forecast */}
      {activeTab === "forecast" && (
        <div className="flex-1 w-full" />
      )}
    </div>
  );
}
