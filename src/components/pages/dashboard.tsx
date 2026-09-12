"use client";

import * as React from "react";
import Link from "next/link";
import { FolderKanban, Target, ListTodo, Lock } from "lucide-react";
import { showToast } from "@/lib/toast";

import { fetchWorkspaceDashboard, prefetchWorkspaceDashboard, getCachedWorkspaceData } from "@/lib/api";

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
    return () => window.removeEventListener("dashboard-tab-change", handleTabChange);
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

  const [userName, setUserName] = React.useState<string>(() => {
    if (profile?.name) return profile.name;
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
    const userEmail = (userProf?.email || "").toLowerCase();
    const uName = (userProf?.name || "").toLowerCase();

    // 1. Check if user is Project Manager (PM) of any active project
    const isPM = Array.isArray(res.projects) && res.projects.some((p: any) => {
      if (p.deleted_at) return false;
      const pmEmail = (p.manager_user_id || "").toLowerCase();
      const pmName = (p.manager_name || "").toLowerCase();
      return (
        (userEmail && (pmEmail === userEmail || pmName === userEmail)) ||
        (uName && (pmName === uName || pmEmail === uName))
      );
    });
    setIsProjectManager(isPM);

    // 2. Check if user is Team Leader / Lead of any active milestone
    const hasMilestone = Array.isArray(res.milestones) && res.milestones.some((m: any) => {
      const leadEmail = (m.lead_user_id || "").toLowerCase();
      const leadName = (m.lead_name || "").toLowerCase();
      return (
        (userEmail && (leadEmail === userEmail || leadName === userEmail)) ||
        (uName && (leadName === uName || leadEmail === uName))
      );
    });
    setIsMilestoneLead(hasMilestone);

    // 3. Check if user is assigned to any active action/task
    const hasAction = Array.isArray(res.actions) && res.actions.some((a: any) => {
      const assigneeEmail = (a.assigned_user_id || "").toLowerCase();
      const assigneeName = (a.assigned_user_name || "").toLowerCase();
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
      evaluateRoles(cached, currentUserProfile);
    }
  }, [currentUserProfile, evaluateRoles]);

  // Load fresh workspace data in background to memory & local browser storage
  React.useEffect(() => {
    prefetchWorkspaceDashboard()
      .then((res) => {
        if (res && res.success) {
          evaluateRoles(res, currentUserProfile);
        }
      })
      .catch((err) => {
        console.warn("Background workspace prefetch failed:", err);
      });
  }, [currentUserProfile, evaluateRoles]);

  // Dynamic warm greeting based on time of day
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const isAdmin = currentUserProfile?.role === "Administrator";

  const allCards = [
    {
      id: "management",
      title: "Project",
      subtitle: "Portfolio Governance",
      description: "Master timeline Gantt chart, portfolio governance, project schedules, and horizon tracking.",
      icon: <FolderKanban size={28} className={isAdmin ? "text-[#0B57D0]" : "text-zinc-400"} />,
      badge: "Master View",
      url: "/workspace?view=management",
      enabled: isAdmin,
      disabledReason: "Access Denied",
    },
    {
      id: "team_leader",
      title: "Milestone / Target",
      subtitle: "Operational Goals",
      description: "Milestone operational planning, action breakdown, delegation, and completion proof verification.",
      icon: <Target size={28} className={(isAdmin || isProjectManager || isMilestoneLead) ? "text-[#0B57D0]" : "text-zinc-400"} />,
      badge: "Milestones",
      url: "/workspace?view=team_leader",
      enabled: isAdmin || isProjectManager || isMilestoneLead,
      disabledReason: "Access Denied",
    },
    {
      id: "team_member",
      title: "Action / Task",
      subtitle: "Execution & Proofs",
      description: "Personal action checklist, task execution, daily updates, and photo proof submissions.",
      icon: <ListTodo size={28} className={(isAdmin || isProjectManager || isMilestoneLead || hasAssignedAction) ? "text-[#0B57D0]" : "text-zinc-400"} />,
      badge: "Tasks",
      url: "/workspace?view=team_member",
      enabled: isAdmin || isProjectManager || isMilestoneLead || hasAssignedAction,
      disabledReason: "You do not have an assigned task",
    },
  ];

  return (
    <div className="content-body flex flex-col flex-1 h-full select-none font-primary overflow-y-auto p-4 md:p-8 items-center justify-center">
      {/* Tab Content: Workspace */}
      {activeTab === "workspace" && (
        <div className="w-full max-w-6xl flex flex-col items-center gap-8 animate-in fade-in duration-300">
          {/* Personalized Header Title */}
          <div className="text-center flex flex-col items-center gap-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-100 text-[#0B57D0] text-xs font-semibold mb-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0] animate-pulse" />
              <span>iB HSG Global</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950">
              {greeting}, <span className="text-[#0B57D0]">{userName}</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-500 font-normal">
              Bridging Strategy, Governance &amp; Operational Excellence
            </p>
          </div>

          {/* Access Cards Container - Always 3 cards in one row on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {allCards.map((card) => {
              if (card.enabled) {
                return (
                  <Link
                    key={card.id}
                    href={card.url}
                    prefetch={true}
                    onMouseEnter={() => prefetchWorkspaceDashboard().catch(() => {})}
                    onTouchStart={() => prefetchWorkspaceDashboard().catch(() => {})}
                    className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-7 flex flex-col h-full shadow-xs hover:shadow-md hover:border-[#0B57D0]/50 transition-all duration-200 cursor-pointer group w-full"
                  >
                    {/* Top Row: Icon & Badge */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-[#F0F4F9] flex items-center justify-center group-hover:bg-[#D3E3FD] transition-colors">
                        {card.icon}
                      </div>
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-zinc-600 border border-slate-200 group-hover:bg-[#D3E3FD]/60 group-hover:text-[#0B57D0] transition-colors">
                        {card.badge}
                      </span>
                    </div>

                    {/* Card Body (Strict top-aligned across all cards) */}
                    <div className="flex flex-col mt-6 flex-1">
                      <h2 className="text-base font-semibold text-zinc-900 group-hover:text-[#0B57D0] transition-colors leading-tight">
                        {card.title}
                      </h2>
                      <span className="text-[11px] font-medium text-[#0B57D0] mt-1">
                        {card.subtitle}
                      </span>
                      <p className="text-xs text-zinc-500 font-normal leading-relaxed mt-2.5">
                        {card.description}
                      </p>
                    </div>

                    {/* Bottom Line */}
                    <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-zinc-400 group-hover:text-[#0B57D0] transition-colors shrink-0">
                      <span>Open View</span>
                      <span className="group-hover:translate-x-1 transition-transform">➔</span>
                    </div>
                  </Link>
                );
              }

              // Disabled card (no layout shift, informative warning toast)
              return (
                <div
                  key={card.id}
                  onClick={() => showToast(card.disabledReason, "warning")}
                  className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-6 md:p-7 flex flex-col h-full opacity-60 cursor-not-allowed w-full shadow-none transition-all select-none group/dis"
                  title={card.disabledReason}
                >
                  {/* Top Row: Muted Icon & Disabled Badge */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-zinc-500 border border-slate-200 flex items-center gap-1">
                      <span>No Role</span>
                    </span>
                  </div>

                  {/* Card Body (Strict top-aligned across all cards) */}
                  <div className="flex flex-col mt-6 flex-1">
                    <h2 className="text-base font-semibold text-zinc-600 leading-tight">
                      {card.title}
                    </h2>
                    <span className="text-[11px] font-medium text-zinc-400 mt-1">
                      {card.subtitle}
                    </span>
                    <p className="text-xs text-zinc-400 font-normal leading-relaxed mt-2.5">
                      {card.description}
                    </p>
                  </div>

                  {/* Bottom Line */}
                  <div className="mt-6 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs font-medium text-zinc-400 shrink-0">
                    <span>Restricted Access</span>
                    <span>➔</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content: Analysis / Forecast (Blank / Empty container) */}
      {(activeTab === "analysis" || activeTab === "forecast") && (
        <div className="flex-1 w-full" />
      )}
    </div>
  );
}
