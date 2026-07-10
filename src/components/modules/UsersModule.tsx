"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { fetchAllUsers, UserProfile, adminUpdateUser, adminDeleteUser } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { EditUserModal } from "../edit-user-modal";
import { NavigationTabs } from "../navigation-tabs";

interface UsersModuleProps {
  idToken?: string;
  profile?: {
    email: string;
    role: string;
  } | null;
}

// Global in-memory cache to store user profiles
let usersCache: any[] | null = null;

export function UsersModule({ idToken = "simulated-id-token", profile }: UsersModuleProps) {
  const [users, setUsers] = React.useState<any[]>(() => usersCache || []);
  const [fetching, setFetching] = React.useState(!usersCache);
  const [activeTab, setActiveTab] = React.useState<"Users" | "Pending" | "Block">("Users");
  const [editingUser, setEditingUser] = React.useState<any | null>(null);

  const columns: Column[] = [
    { id: "email", header: "Email", accessor: "email" },
    { id: "name", header: "Full Name", accessor: "name" },
    { id: "phone_number", header: "Phone Number", accessor: "phone_number" },
    { id: "role", header: "Security Role", accessor: "role" },
    { id: "active", header: "Approval Status", accessor: "active_label" },
  ];

  const loadUsers = React.useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setFetching(true);
    }
    try {
      const myEmail = profile?.email || "admin@hsg-global.com";
      const data = await fetchAllUsers(idToken, myEmail);
      // Map active numeric status to label, and set row ID to email (required by DataTable primary key check)
      const mapped = data.map((u) => ({
        ...u,
        id: u.email,
        active_label: u.active === 1 ? "Active" : u.active === 0 ? "Pending" : "Blocked",
      }));
      setUsers(mapped);
      usersCache = mapped;
    } catch (err: any) {
      showToast(err.message || "Failed to load users database", "error");
    } finally {
      setFetching(false);
    }
  }, [idToken, profile]);

  React.useEffect(() => {
    const hasCache = usersCache !== null;
    loadUsers(hasCache);
  }, [loadUsers]);

  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await loadUsers();
      showToast("Users database refreshed successfully!", "success");
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadUsers]);

  const handleSaveModalUser = async (updatedUser: any) => {
    try {
      const myEmail = profile?.email || "admin@hsg-global.com";
      await adminUpdateUser(
        idToken,
        myEmail,
        updatedUser.email,
        updatedUser.role,
        updatedUser.pages_access || [],
        updatedUser.modules_access || [],
        updatedUser.active,
        updatedUser.name,
        updatedUser.phone_number
      );
      showToast(`User ${updatedUser.email} updated successfully!`, "success");
      loadUsers(true); // silent background load
    } catch (err: any) {
      showToast(err.message || "Failed to update user details", "error");
      throw err;
    }
  };

  const handleDeleteUser = async (targetEmail: string) => {
    try {
      const myEmail = profile?.email || "admin@hsg-global.com";
      if (targetEmail === myEmail) {
        showToast("Cannot delete your own administrator account", "error");
        return;
      }
      await adminDeleteUser(idToken, myEmail, targetEmail);
      showToast(`User ${targetEmail} deleted successfully!`, "success");
      loadUsers(true); // silent background load
    } catch (err: any) {
      showToast(err.message || "Failed to delete user", "error");
      loadUsers(true);
      throw err;
    }
  };

  const handleBlockUser = async (targetUser: any) => {
    try {
      const myEmail = profile?.email || "admin@hsg-global.com";
      if (targetUser.email === myEmail) {
        showToast("Cannot block your own administrator account", "error");
        return;
      }
      await adminUpdateUser(
        idToken,
        myEmail,
        targetUser.email,
        targetUser.role,
        targetUser.pages_access || [],
        targetUser.modules_access || [],
        2, // active = 2 (Blocked)
        targetUser.name,
        targetUser.phone_number
      );
      showToast(`User ${targetUser.email} blocked successfully!`, "success");
      loadUsers(true); // silent background load
    } catch (err: any) {
      showToast(err.message || "Failed to block user", "error");
    }
  };

  if (profile?.role !== "Administrator") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-lg shadow-xs font-primary">
        <span className="text-zinc-500 text-sm font-semibold italic text-center">
          Access Denied: Only Administrators can view or manage users.
        </span>
      </div>
    );
  }

  // Filter users based on active tab
  const filteredUsers = users.filter((u) => {
    if (activeTab === "Users") return u.active === 1;
    if (activeTab === "Pending") return u.active === 0;
    if (activeTab === "Block") return u.active === 2;
    return false;
  });

  const tabs = [
    { id: "Users", label: "Users", desc: "Manage system credentials and assign access permissions." },
    { id: "Pending", label: "Pending", desc: "Approve or reject new registrations waiting for activation." },
    { id: "Block", label: "Block", desc: "Blocked accounts with suspended system permissions." }
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px]">
      {/* Reusable Sub-Navigation NavigationTabs Component */}
      <div className="content-header">
        <NavigationTabs 
          tabs={tabs}
          activeTabId={activeTab}
          onTabSelect={(tabId) => setActiveTab(tabId as any)}
          titleSuffix="Registry"
        />
      </div>

      {/* Data Table */}
      <div className="content-body flex-1 w-full overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredUsers}
          userRole="admin"
          title={`${activeTab} Database Registry`}
          fetching={fetching}
          onEditRow={(row) => setEditingUser(row)}
          onDeleteRow={activeTab === "Block" ? handleDeleteUser : undefined}
          onBlockRow={activeTab === "Users" ? handleBlockUser : undefined}
          height="h-full"
        />
      </div>

      {/* Edit User Modal Popup */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveModalUser}
        />
      )}
    </div>
  );
}
