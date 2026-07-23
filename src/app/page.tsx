"use client";

import * as React from "react";
import { SidePanel } from "@/components/side-panel";
import { TopBar } from "@/components/top-bar";
import { menuConfig } from "@/config/menu-config";
import { ToastContainer } from "@/components/toast-container";
import { auth, googleProvider, signInWithPopup, signOut } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { syncUserProfile, fetchMyProfile, fetchLatestContract, UserProfile } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { CustomButton } from "@/components/custom-button";
import { ShieldAlert } from "lucide-react";
import { WelcomeAboardScreen } from "@/components/welcome-aboard";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function Home() {
  const [firebaseUser, setFirebaseUser] = React.useState<any>(null);
  const [idToken, setIdToken] = React.useState<string>("");
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [activeItem, setActiveItem] = React.useState("Dashboard");
  const [breadcrumbPath, setBreadcrumbPath] = React.useState<string[]>(["Dashboard"]);

  const [conflictDialogOpen, setConflictDialogOpen] = React.useState(false);
  const [pendingLogin, setPendingLogin] = React.useState<{
    token: string;
    email: string;
    name: string;
  } | null>(null);

  const [latestContractUpdatedAt, setLatestContractUpdatedAt] = React.useState<number>(0);
  const [navConfirmOpen, setNavConfirmOpen] = React.useState<boolean>(false);
  const [pendingNavAction, setPendingNavAction] = React.useState<{
    type: "menu" | "back" | "breadcrumb";
    target: any;
  } | null>(null);

  // Load latest contract version to enforce re-signing
  React.useEffect(() => {
    fetchLatestContract()
      .then((contract) => {
        if (contract && contract.updated_at) {
          setLatestContractUpdatedAt(contract.updated_at);
        }
      })
      .catch((e) => console.error("Failed to load latest contract details:", e));
  }, []);

  // Listen to Firebase Auth state changes
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setFirebaseUser(user);
          setIdToken(token);
          
          // Retrieve or generate unique session ID for this browser tab/session
          let sid = localStorage.getItem("session_id");
          if (!sid) {
            sid = "sess_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
            localStorage.setItem("session_id", sid);
          }

          // Sync profile from backend
          try {
            const dbProfile = await syncUserProfile(
              token,
              user.email || "",
              user.displayName || user.email || "Google User",
              sid
            );
            setProfile(dbProfile);
          } catch (err: any) {
            if (err.code === "session_conflict") {
              setPendingLogin({
                token,
                email: user.email || "",
                name: user.displayName || user.email || "Google User",
              });
              setConflictDialogOpen(true);
            } else {
              showToast(err.message || "Failed to load user profile", "error");
              await signOut(auth);
            }
          }
        } catch (err: any) {
          showToast(err.message || "Failed to load user profile", "error");
        }
      } else {
        setFirebaseUser(null);
        setIdToken("");
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleForceLoginConfirm = async () => {
    if (!pendingLogin) return;
    try {
      setLoading(true);
      const sid = localStorage.getItem("session_id");
      const dbProfile = await syncUserProfile(
        pendingLogin.token,
        pendingLogin.email,
        pendingLogin.name,
        sid,
        true // force = true
      );
      setProfile(dbProfile);
      setPendingLogin(null);
      setConflictDialogOpen(false);
      showToast("Logged in successfully. Other sessions terminated.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to overwrite session", "error");
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  const handleForceLoginCancel = async () => {
    setPendingLogin(null);
    setConflictDialogOpen(false);
    await signOut(auth);
  };

  // Listen to set-breadcrumb event from child views
  React.useEffect(() => {
    const handleSetBreadcrumb = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setBreadcrumbPath(customEvent.detail);
      }
    };
    window.addEventListener("set-breadcrumb", handleSetBreadcrumb);
    return () => {
      window.removeEventListener("set-breadcrumb", handleSetBreadcrumb);
    };
  }, []);

  // Real-time listener: Poll D1 database profile every 4 seconds to detect access updates/revocation/approval immediately
  React.useEffect(() => {
    if (!idToken || !firebaseUser || !profile) return;

    const interval = setInterval(async () => {
      try {
        const freshProfile = await fetchMyProfile(idToken, firebaseUser.email);
        
        // Check if any critical fields have changed to avoid unnecessary state updates
        const hasActiveChanged = freshProfile.active !== profile.active;
        const hasRoleChanged = freshProfile.role !== profile.role;
        const hasPagesChanged = JSON.stringify(freshProfile.pages_access) !== JSON.stringify(profile.pages_access);
        const hasModulesChanged = JSON.stringify(freshProfile.modules_access) !== JSON.stringify(profile.modules_access);

        if (hasActiveChanged || hasRoleChanged || hasPagesChanged || hasModulesChanged) {
          setProfile(freshProfile);

          // Handle automatic approval welcome toast
          if (profile.active === 0 && freshProfile.active === 1) {
            showToast("Your account registration has been approved! Welcome to iB.", "success");
          }
          // Handle automatic block toast
          if (profile.active !== 2 && freshProfile.active === 2) {
            showToast("Your access has been suspended by the administrator.", "error");
          }
        }

        // Redirect if active and viewing a page they no longer have permission to access
        if (freshProfile.active === 1 && activeItem !== "Dashboard") {
          const isAdmin = freshProfile.role === "Administrator";
          const isManager = freshProfile.role === "Manager";
          const hasAccess =
            activeItem === "Dashboard" ||
            isAdmin ||
            (isManager && activeItem !== "Administrator") ||
            freshProfile.pages_access.includes(activeItem);

          if (!hasAccess) {
            setActiveItem("Dashboard");
            setBreadcrumbPath(["Dashboard"]);
            showToast("Access to this workspace has been revoked by the administrator.", "error");
          }
        }
      } catch (err: any) {
        if (err.code === "session_superseded") {
          showToast("You have been signed out because this account is now active on another device.", "error");
          await signOut(auth);
        } else {
          console.warn("Background auth check failed:", err);
        }
      }
    }, 4000); // 4-second poll

    return () => clearInterval(interval);
  }, [idToken, firebaseUser, activeItem, profile]);

  const handlePendingNavConfirm = () => {
    localStorage.removeItem("ib_promoter_schedules_draft");
    localStorage.removeItem("ib_promoter_schedules_backup");
    window.dispatchEvent(new CustomEvent("ib-clear-edit-mode"));

    if (pendingNavAction) {
      const { type, target } = pendingNavAction;
      if (type === "menu") {
        executeMenuSelect(target);
      } else if (type === "back") {
        executeBack();
      } else if (type === "breadcrumb") {
        executeNavigateBreadcrumb(target);
      }
    }
    setPendingNavAction(null);
    setNavConfirmOpen(false);
  };

  const handlePendingNavCancel = () => {
    setPendingNavAction(null);
    setNavConfirmOpen(false);

    // If there is a draft in localStorage, redirect back to the Promoter module
    const draft = localStorage.getItem("ib_promoter_schedules_draft");
    if (draft) {
      setActiveItem("Frontline");
      setBreadcrumbPath(["Frontline", "Promoter"]);
      window.dispatchEvent(new CustomEvent("set-breadcrumb", { detail: ["Frontline", "Promoter"] }));
      window.dispatchEvent(new CustomEvent("collapse-sidepanel"));
    }
  };

  const executeMenuSelect = async (item: string) => {
    setActiveItem(item);
    setBreadcrumbPath([item]);
    window.dispatchEvent(new CustomEvent("breadcrumb-back", { detail: [item] }));

    if (idToken && firebaseUser) {
      try {
        const freshProfile = await fetchMyProfile(idToken, firebaseUser.email);
        setProfile(freshProfile);

        // Check if access was revoked
        const isAdmin = freshProfile.role === "Administrator";
        const isManager = freshProfile.role === "Manager";
        const hasAccess =
          item === "Dashboard" ||
          isAdmin ||
          (isManager && item !== "Administrator") ||
          freshProfile.pages_access.includes(item);

        if (!hasAccess) {
          setActiveItem("Dashboard");
          setBreadcrumbPath(["Dashboard"]);
          showToast("Access revoked by administrator.", "error");
        }
      } catch (err) {
        console.warn("Failed to check access privileges on navigation:", err);
      }
    }
  };

  const handleMenuSelect = async (item: string) => {
    const draft = localStorage.getItem("ib_promoter_schedules_draft");
    if (draft) {
      setPendingNavAction({ type: "menu", target: item });
      setNavConfirmOpen(true);
    } else {
      executeMenuSelect(item);
    }
  };

  const executeBack = () => {
    if (breadcrumbPath.length > 1) {
      const nextPath = breadcrumbPath.slice(0, -1);
      setBreadcrumbPath(nextPath);
      window.dispatchEvent(new CustomEvent("breadcrumb-back", { detail: nextPath }));
    }
  };

  const handleBack = () => {
    const draft = localStorage.getItem("ib_promoter_schedules_draft");
    if (draft) {
      setPendingNavAction({ type: "back", target: null });
      setNavConfirmOpen(true);
    } else {
      executeBack();
    }
  };

  const executeNavigateBreadcrumb = (index: number) => {
    const nextPath = breadcrumbPath.slice(0, index + 1);
    setBreadcrumbPath(nextPath);
    if (index === 0) {
      setActiveItem(nextPath[0]);
    }
    window.dispatchEvent(new CustomEvent("breadcrumb-back", { detail: nextPath }));
  };

  const handleNavigateBreadcrumb = (index: number) => {
    if (index >= 0 && index < breadcrumbPath.length - 1) {
      const draft = localStorage.getItem("ib_promoter_schedules_draft");
      if (draft) {
        setPendingNavAction({ type: "breadcrumb", target: index });
        setNavConfirmOpen(true);
      } else {
        executeNavigateBreadcrumb(index);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      showToast(err.message || "Sign-in failed", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveItem("Dashboard");
      setBreadcrumbPath(["Dashboard"]);
      showToast("Signed out successfully", "info");
    } catch (err: any) {
      showToast(err.message || "Logout failed", "error");
    }
  };

  const renderActivePage = () => {
    if (!profile) return null;

    const isAdmin = profile.role === "Administrator";
    const isManager = profile.role === "Manager";

    // Enforce access control check
    const hasAccess = 
      activeItem === "Dashboard" || 
      isAdmin || 
      (isManager && activeItem !== "Administrator") || 
      profile.pages_access.includes(activeItem);

    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center font-primary py-12">
          <div className="text-red-500 text-lg font-semibold">Access Denied</div>
          <p className="text-zinc-500 text-sm max-w-md">
            You do not have permission to view the "{activeItem}" workspace. Please contact your administrator.
          </p>
        </div>
      );
    }

    // Bypass placeholder check for categories
    const categoryPages = ["Frontline", "Database", "Sales & Channels", "Stock", "Office Tools", "Marketing & Content", "Website", "Administrator"];
    if (breadcrumbPath.length > 1 && !categoryPages.includes(activeItem)) {
      return (
        <div className="flex flex-col gap-4 font-primary">
          <h2 className="text-2xl font-bold text-zinc-950">{breadcrumbPath[breadcrumbPath.length - 1]}</h2>
          <p className="text-sm text-zinc-500">
            This is the detailed workspace view for: {breadcrumbPath.join(" / ")}. Click the back arrow in the header to return.
          </p>
        </div>
      );
    }

    const activeRoute = menuConfig.find((route) => route.id === activeItem);
    if (activeRoute) {
      // Inject user profile and idToken as props dynamically using React.cloneElement
      return React.cloneElement(activeRoute.component as React.ReactElement<{ profile: UserProfile | null; idToken?: string; breadcrumbPath?: string[] }>, { profile, idToken, breadcrumbPath });
    }
    return null;
  };

  const renderMainContent = () => {
    // 1. Loading Overlay Screen
    if (loading) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#EEEEEE] select-none animate-in fade-in duration-300">
          <span className="font-primary text-sm font-semibold text-zinc-600 animate-pulse">
            Connecting to Internal Bridge...
          </span>
        </div>
      );
    }

    // 2. Sign In Required Screen
    if (!firebaseUser || !profile) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#EEEEEE] p-6 select-none font-primary animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#E5E5E5] border border-zinc-300 rounded-lg p-6 shadow-md flex flex-col gap-6 items-center text-center">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">iB HSG Global</h1>
              <p className="text-sm font-medium text-zinc-500">Connecting Teams. Bridging Operations.</p>
            </div>
            <div className="w-full border-t border-zinc-300/60 my-2" />
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Welcome to the HSG Global Internal Bridge. Authenticate below using your corporate Google login to access your workspaces.
            </p>
            <CustomButton onClick={handleLogin} variant="dark" className="w-full mt-2 h-9 text-xs">
              Sign In with Google
            </CustomButton>
          </div>
        </div>
      );
    }

    // 3. Welcome Aboard Onboarding Lock Screen (First Sign In or New Contract Version)
    const needsToSignContract = 
      (profile.email || "").trim().toLowerCase() !== "hsgglobalpteltd@gmail.com" && (
        !profile.contract_signed_at || 
        (latestContractUpdatedAt > 0 && profile.contract_signed_at < latestContractUpdatedAt)
      );

    if (needsToSignContract) {
      return (
        <WelcomeAboardScreen 
          profile={profile} 
          idToken={idToken} 
          onLogout={handleLogout}
          onComplete={(updatedProfile) => setProfile(updatedProfile)}
        />
      );
    }

    // 4. User Suspended/Blocked Lock Screen
    if (profile.active === 2) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#EEEEEE] p-6 select-none font-primary animate-fade-in">
          <div className="w-full max-w-sm bg-[#E5E5E5] border border-zinc-300 rounded-lg p-6 shadow-md flex flex-col gap-6 items-center text-center">
            <div className="h-12 w-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-zinc-950">Access Denied</h2>
              <p className="text-sm text-zinc-500">Please contact admin.</p>
            </div>
            <div className="w-full border-t border-zinc-300/60 my-1" />
            <CustomButton onClick={handleLogout} variant="default" className="w-full h-9 text-xs">
              Log Out
            </CustomButton>
          </div>
        </div>
      );
    }

    // 5. User Inactive (Pending Approval) Lock Screen
    if (profile.active === 0) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#EEEEEE] p-6 select-none font-primary animate-fade-in">
          <div className="w-full max-w-sm bg-[#E5E5E5] border border-zinc-300 rounded-lg p-6 shadow-md flex flex-col gap-6 items-center text-center">
            <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-zinc-950">Pending Approval</h2>
              <p className="text-sm text-zinc-500">Please contact admin for approval.</p>
            </div>
            <div className="w-full border-t border-zinc-300/60 my-1" />
            <CustomButton onClick={handleLogout} variant="default" className="w-full h-9 text-xs">
              Log Out
            </CustomButton>
          </div>

          {/* Live scanning progress bar line under the card container */}
          <div className="w-full max-w-sm h-1.5 bg-zinc-300/60 rounded-full mt-4 overflow-hidden relative">
            <div className="animate-progress-slide rounded-full" />
          </div>
        </div>
      );
    }

    // 6. Fully Authenticated Main Application Interface
    return (
      <>
        {/* Mobile View Block */}
        <div className="flex md:hidden print:hidden min-h-screen w-full flex-col items-center justify-center bg-[#F0F4F9] p-8 select-none font-primary text-center">
          <div className="flex flex-col gap-5 items-center max-w-sm">
            <div className="h-12 w-12 rounded-full bg-[#D3E3FD] text-[#0B57D0] flex items-center justify-center shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-monitor-smartphone"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Desktop Layout Required</h2>
              <p className="text-xs text-zinc-650 font-semibold leading-relaxed">
                The HSG Global Internal Bridge is optimized for desktop and tablet screens to ensure proper database management and visibility.
              </p>
            </div>
            <div className="w-24 border-t border-[#AECBFA] my-1" />
            <p className="text-[10px] text-[#0B57D0] font-bold uppercase tracking-wider font-footer">
              Please login from a tablet or PC
            </p>
          </div>
        </div>

        {/* Desktop/Tablet View */}
        <div className="hidden md:flex print:flex h-screen w-full bg-[#F8F9FC] overflow-hidden">
          <SidePanel 
            activeItem={activeItem} 
            onSelectMenu={handleMenuSelect} 
            user={firebaseUser}
            profile={profile}
            onLogout={handleLogout}
          />
          <div className="workspace-wrapper flex flex-col flex-1 h-screen overflow-hidden min-w-0">
            <TopBar 
              breadcrumbPath={breadcrumbPath} 
              onBack={handleBack} 
              onNavigateBreadcrumb={handleNavigateBreadcrumb}
            />
            <main className="main-content flex flex-col flex-1 p-[20px] overflow-hidden min-w-0">
              {renderActivePage()}
            </main>
          </div>
        </div>
      </>
    );
  };

  // 4. Fully Authenticated Main Application Interface
  return (
    <>
      {renderMainContent()}
      <ToastContainer />

      {/* Custom Popup Modal for Session Conflict */}
      {conflictDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300 font-primary select-none">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-5">
            
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert animate-pulse"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-zinc-950">Active Session Detected</h3>
                <p className="text-xs text-zinc-500">
                  This account is currently active on another device.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 border border-zinc-200/50 rounded-xl p-3.5">
              Would you like to sign out of the other active device and establish a new session on this device?
            </div>

            {/* Modal Footer / Actions */}
            <div className="flex items-center justify-end gap-3 mt-1">
              <button
                onClick={handleForceLoginCancel}
                className="h-9 px-4 text-xs font-bold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-all select-none cursor-pointer flex items-center justify-center focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleForceLoginConfirm}
                className="h-9 px-4 text-xs font-bold rounded-lg border border-zinc-900 bg-zinc-900 text-[#EEEEEE] hover:bg-zinc-800 transition-all select-none cursor-pointer flex items-center justify-center shadow-sm hover:shadow focus:outline-none"
              >
                Yes, Sign Out Other Device
              </button>
            </div>

          </div>
        </div>
      )}

      <ConfirmDialog
        open={navConfirmOpen}
        onOpenChange={setNavConfirmOpen}
        title="Unsaved Changes"
        description="You have unsaved schedule changes. Do you want to continue without saving?"
        variant="danger"
        confirmText="Continue without saving"
        cancelText="Cancel"
        onConfirm={handlePendingNavConfirm}
        onCancel={handlePendingNavCancel}
      />
    </>
  );
}
