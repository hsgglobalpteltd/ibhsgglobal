"use client";

import * as React from "react";
import Link from "next/link";
import { FolderKanban, Target, ListTodo, ChevronRight } from "lucide-react";
import { showToast } from "@/lib/toast";

import { fetchWorkspaceDashboard, prefetchWorkspaceDashboard, getCachedWorkspaceData } from "@/lib/api";
import { DashboardAiSummary } from "@/components/dashboard-ai-summary";
import { DashboardAnalysisView } from "@/components/dashboard-analysis-view";

interface DashboardPageProps {
  profile?: any;
  idToken?: string;
  breadcrumbPath?: string[];
}

export function DashboardPage({ profile }: DashboardPageProps) {
  const [activeTab, setActiveTab] = React.useState<"workspace" | "analysis" | "forecast">("workspace");

  React.useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<"workspace" | "analysis" | "forecast">;
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

  // User permission flags for P1, P2, P3 perspectives
  const [isProjectManager, setIsProjectManager] = React.useState<boolean>(false);
  const [isMilestoneLead, setIsMilestoneLead] = React.useState<boolean>(false);
  const [hasAssignedAction, setHasAssignedAction] = React.useState<boolean>(false);

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

  // Helper to evaluate roles from workspace data
  const evaluateRoles = React.useCallback((res: any, userProf: any) => {
    if (!res || !res.success) return;
    const userEmail = (userProf?.email || "").toLowerCase().trim();
    const uName = (userProf?.name || "").toLowerCase().trim();

    // 1. Check if user is Project Manager (PM) of any active project
    const isPM = Array.isArray(res.projects) && res.projects.some((p: any) => {
      if (p.deleted_at) return false;
      const pmEmail = (p.manager_user_id || "").toLowerCase().trim();
      const pmName = (p.manager_name || "").toLowerCase().trim();
      return (
        (userEmail && (pmEmail === userEmail || pmName === userEmail)) ||
        (uName && (pmName === uName || pmEmail === uName))
      );
    });
    setIsProjectManager(isPM);

    // 2. Check if user is Team Leader / Lead of any active milestone
    const hasMilestone = Array.isArray(res.milestones) && res.milestones.some((m: any) => {
      const leadEmail = (m.lead_user_id || "").toLowerCase().trim();
      const leadName = (m.lead_name || "").toLowerCase().trim();
      return (
        (userEmail && (leadEmail === userEmail || leadName === userEmail)) ||
        (uName && (leadName === uName || leadEmail === uName))
      );
    });
    setIsMilestoneLead(hasMilestone);

    // 3. Check if user is assigned to any active action/task
    const hasAction = Array.isArray(res.actions) && res.actions.some((a: any) => {
      const assigneeEmail = (a.assigned_user_id || "").toLowerCase().trim();
      const assigneeName = (a.assigned_user_name || "").toLowerCase().trim();
      const emailList = assigneeEmail.split(",").map((s: string) => s.trim()).filter(Boolean);
      const nameList = assigneeName.split(",").map((s: string) => s.trim()).filter(Boolean);

      const matchEmail = userEmail && (emailList.includes(userEmail) || assigneeEmail.includes(userEmail));
      const matchName = uName && (nameList.includes(uName) || assigneeName.includes(uName));
      return matchEmail || matchName;
    });
    setHasAssignedAction(hasAction);
  }, []);

  // Restore cached workspace data immediately on mount for instant 0ms cards setup
  React.useEffect(() => {
    const cached = getCachedWorkspaceData();
    if (cached) {
      evaluateRoles(cached, effectiveProfile);
    }
  }, [effectiveProfile, evaluateRoles]);

  // Load fresh workspace data in background to memory & local browser storage
  React.useEffect(() => {
    prefetchWorkspaceDashboard()
      .then((res) => {
        if (res && res.success) {
          evaluateRoles(res, effectiveProfile);
        }
      })
      .catch((err) => {
        console.warn("Background workspace prefetch failed:", err);
      });
  }, [effectiveProfile, evaluateRoles]);

  // Dynamic warm greeting based on time of day
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const roleStr = (effectiveProfile?.role || "").trim().toLowerCase();
  const isAdmin = roleStr === "administrator" || roleStr === "admin";

  const allCards = [
    {
      id: "management",
      title: "Project",
      subtitle: "Portfolio Governance & Timeline",
      icon: <FolderKanban size={20} />,
      url: "/workspace?view=management",
      enabled: true,
      disabledReason: "Access Denied",
    },
    {
      id: "team_leader",
      title: "Milestone / Target",
      subtitle: "Operational Goals & Verification",
      icon: <Target size={20} />,
      url: "/workspace?view=team_leader",
      enabled: true,
      disabledReason: "Access Denied",
    },
    {
      id: "team_member",
      title: "Action / Task",
      subtitle: "Execution Feed & Proof Submissions",
      icon: <ListTodo size={20} />,
      url: "/workspace?view=team_member",
      enabled: true,
      disabledReason: "You do not have an assigned task",
    },
  ];

  return (
    <div className="content-body flex flex-col flex-1 h-full select-none font-primary overflow-hidden p-3 md:p-4">
      {/* Tab Content: Workspace (Combined WPD1 & WPD2 Side-by-Side) */}
      {activeTab === "workspace" && (
        <div className="flex flex-row gap-4 lg:gap-5 xl:gap-6 w-full h-full min-h-0 overflow-hidden items-stretch animate-in fade-in duration-300">
          
          {/* Left Side: WPD1 (Clean Workspace Navigation - Fixed proportion) */}
          <div className="w-[280px] sm:w-[300px] lg:w-[330px] xl:w-[360px] shrink-0 h-full min-h-0 flex flex-col justify-center gap-5 overflow-y-auto pr-1">
            {/* Header Greeting (Moved down, attached nicely above cards) */}
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

            {/* 3 Simplified Sleek Action Cards */}
            <div className="flex flex-col gap-3 min-h-0">
              {allCards.map((card) => {
                if (card.enabled) {
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("dashboard-workspace-view", { detail: card.id }));
                      }}
                      onMouseEnter={() => prefetchWorkspaceDashboard().catch(() => {})}
                      onTouchStart={() => prefetchWorkspaceDashboard().catch(() => {})}
                      className="bg-white rounded-xl border border-slate-200/85 p-3.5 sm:p-4 flex items-center justify-between gap-3.5 shadow-2xs hover:shadow-xs hover:border-[#0B57D0]/50 hover:bg-[#F8F9FD] transition-all duration-150 cursor-pointer group select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#F0F4F9] text-[#0B57D0] group-hover:bg-[#0B57D0] group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                          {card.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h2 className="text-sm font-bold text-zinc-900 group-hover:text-[#0B57D0] transition-colors leading-snug truncate">
                            {card.title}
                          </h2>
                          <span className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {card.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-zinc-400 group-hover:text-[#0B57D0] shrink-0 transition-colors">
                        <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                }

                // Disabled card (no layout shift, informative warning toast)
                return (
                  <div
                    key={card.id}
                    onClick={() => showToast(card.disabledReason, "warning")}
                    className="bg-slate-50/70 rounded-xl border border-slate-200/60 p-3.5 sm:p-4 flex items-center justify-between gap-3.5 opacity-55 cursor-not-allowed shadow-none select-none"
                    title={card.disabledReason}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-200/70 text-zinc-400 flex items-center justify-center shrink-0">
                        {card.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h2 className="text-sm font-semibold text-zinc-600 leading-snug truncate">
                          {card.title}
                        </h2>
                        <span className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {card.subtitle}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-zinc-500 border border-slate-200 shrink-0">
                      No Role
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: WPD2 (What's Happening Today Console) */}
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <DashboardAiSummary userName={userName} profile={effectiveProfile} />
          </div>
        </div>
      )}

      {/* Tab Content: Analysis */}
      {activeTab === "analysis" && (
        <DashboardAnalysisView />
      )}

      {/* Tab Content: Forecast (Blank / Empty container) */}
      {activeTab === "forecast" && (
        <div className="flex-1 w-full" />
      )}
    </div>
  );
}
