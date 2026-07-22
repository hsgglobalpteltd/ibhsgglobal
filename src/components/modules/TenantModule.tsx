"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { NavigationTabs } from "../navigation-tabs";

interface TenantModuleProps {
  idToken?: string;
  profile?: any;
}

const WORKER_URL = "https://ib.hsgglobalpteltd.workers.dev";

export function TenantModule({ idToken, profile }: TenantModuleProps) {
  const [tenants, setTenants] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"Users" | "Pending" | "Suspended">("Users");

  const columns: Column[] = [
    { id: "email", header: "Email Address", accessor: "email" },
    { id: "name", header: "Name / Company", accessor: "name" },
    { id: "phone", header: "Phone Number", accessor: "phone" },
    { id: "created_at", header: "Registered Date", accessor: "created_at_label" },
    { id: "approved", header: "Approval Status", accessor: "approved_label" },
  ];

  const loadTenants = React.useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/tenants`, {
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        }
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      
      const mapped = list.map((t: any) => ({
        ...t,
        id: t.email, // Required by DataTable primary key check
        created_at_label: t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB") : "-",
        approved_label: t.approved === 1 ? "Approved" : t.approved === 0 ? "Pending" : "Suspended"
      }));
      setTenants(mapped);
    } catch (err: any) {
      showToast(err.message || "Failed to load users list", "error");
    } finally {
      setFetching(false);
    }
  }, [idToken]);

  React.useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await loadTenants();
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadTenants]);

  const handleApproveUser = async (row: any) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/tenants/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ email: row.email })
      });
      if (!res.ok) throw new Error();
      showToast(`Approved user portal account: ${row.email}`, "success");
      loadTenants();
    } catch {
      showToast("Failed to approve user portal account.", "error");
    }
  };

  const handleSuspendUser = async (row: any) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/tenants/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ email: row.email, status: -1 })
      });
      if (!res.ok) throw new Error();
      showToast(`Suspended user portal account: ${row.email}`, "success");
      loadTenants();
    } catch {
      showToast("Failed to suspend user portal account.", "error");
    }
  };

  const handleUnsuspendUser = async (row: any) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/tenants/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ email: row.email, status: 0 }) // Revert to pending
      });
      if (!res.ok) throw new Error();
      showToast(`Reverted user status to pending: ${row.email}`, "success");
      loadTenants();
    } catch {
      showToast("Failed to change user status.", "error");
    }
  };

  const handleDeleteUser = async (email: string) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/tenants/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error();
      showToast(`Deleted user registry: ${email}`, "success");
      loadTenants();
    } catch {
      showToast("Failed to delete user registry.", "error");
    }
  };

  // Filter based on active tab
  const filteredUsers = tenants.filter((t) => {
    if (activeTab === "Users") return t.approved === 1;
    if (activeTab === "Pending") return t.approved === 0;
    if (activeTab === "Suspended") return t.approved === -1;
    return false;
  });

  const tabs = [
    { id: "Users", label: "Portal Users", desc: "Approved active users with website builder workspace access." },
    { id: "Pending", label: "Pending", desc: "Pending user registration requests waiting for authorization." },
    { id: "Suspended", label: "Suspended", desc: "Suspended portal user accounts with inactive workspace access." }
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0">
      <div className="content-header">
        <NavigationTabs 
          tabs={tabs}
          activeTabId={activeTab}
          onTabSelect={(tabId) => setActiveTab(tabId as any)}
          titleSuffix="Access"
        />
      </div>

      <div className="content-body flex-1 w-full overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredUsers}
          userRole="admin"
          title={`${activeTab === "Users" ? "Active" : activeTab} Registry`}
          fetching={fetching}
          onEditRow={activeTab === "Pending" ? handleApproveUser : undefined} // Map edit row as Approve inside Pending
          onBlockRow={activeTab === "Users" ? handleSuspendUser : activeTab === "Suspended" ? handleUnsuspendUser : undefined}
          onDeleteRow={handleDeleteUser}
          height="h-full"
        />
      </div>
    </div>
  );
}
