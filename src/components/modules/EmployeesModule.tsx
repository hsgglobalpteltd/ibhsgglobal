"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";
import { Wrench, UserPlus, Eye, EyeOff, Camera, Trash2, ShieldAlert, Contact } from "lucide-react";

interface EmployeesModuleProps {
  profile?: {
    role: string;
    name?: string;
    email?: string;
  } | null;
}

interface Employee {
  id: string;
  type: "Fulltime" | "Partimer";
  name: string;
  full_name?: string;
  in: string;
  pin: string;
  phone?: string;
  email?: string;
  paynow_number?: string;
  photo_url?: string;
  address?: string;
  note?: string;
  role?: string; // JSON string of string[] roles
  archived?: boolean | number;
  created_at?: bigint | number;
  logs?: string; // Audit logs stringified JSON
}

const AVAILABLE_ROLES = ["Picker", "Driver", "Merchandiser", "Promoter", "Staff Claim", "Warehouse", "Tiktok", "POS"];

export function EmployeesModule({ profile }: EmployeesModuleProps) {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [fetching, setFetching] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"Fulltime" | "Partimer" | "Deactive">("Fulltime");
  const [editingEmployee, setEditingEmployee] = React.useState<any | null>(null);
  const [viewingEmployee, setViewingEmployee] = React.useState<Employee | null>(null);
  const [timelineEmployee, setTimelineEmployee] = React.useState<Employee | null>(null);

  const columns: Column[] = [
    { id: "actions", header: "", accessor: "actions" },
    { id: "name", header: "Name", accessor: "name_display" },
    { id: "full_name", header: "Full Name", accessor: "full_name" },
    { id: "in", header: "Identity Number (IN)", accessor: "in" },
    { id: "phone", header: "Phone", accessor: "phone" },
    { id: "email", header: "Email", accessor: "email" },
    { id: "paynow_number", header: "PayNow Number", accessor: "paynow_number" },
    { id: "roles_list", header: "Application Access Roles", accessor: "roles_display" },
    { id: "logs", header: "Audit Log", accessor: "logs_display" }
  ];

  const loadEmployees = React.useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setFetching(true);
    }
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/employees");
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : [];
      setEmployees(list);
    } catch (err: any) {
      showToast("Failed to load employees: " + err.message, "error");
    } finally {
      setFetching(false);
    }
  }, []);

  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Global Refresh Listener
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await loadEmployees();
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadEmployees]);

  const handleSaveEmployee = async (updatedEmp: any) => {
    const isNew = !!updatedEmp.isNew;

    // PIN Uniqueness Check
    const pin = String(updatedEmp.pin).trim();
    if (!/^\d{4}$/.test(pin)) {
      showToast("PIN code must be exactly 4 digits!", "error");
      return;
    }

    const pinExists = employees.some(
      (e) => e.id !== updatedEmp.id && String(e.pin).trim() === pin
    );
    if (pinExists) {
      showToast("This PIN code is already assigned to another employee!", "error");
      return;
    }

    setEditingEmployee(null);

    const cleanData: any = {
      id: updatedEmp.id || `emp_${Date.now()}`,
      type: updatedEmp.type,
      name: String(updatedEmp.name || "").trim(),
      full_name: String(updatedEmp.full_name || "").trim(),
      in: String(updatedEmp.in || "").trim().toUpperCase(),
      pin: pin,
      phone: String(updatedEmp.phone || "").trim(),
      email: String(updatedEmp.email || "").trim(),
      paynow_number: String(updatedEmp.paynow_number || "").trim(),
      photo_url: String(updatedEmp.photo_url || "").trim(),
      address: String(updatedEmp.address || "").trim(),
      note: String(updatedEmp.note || "").trim(),
      role: JSON.stringify(updatedEmp.role || []),
      archived: updatedEmp.archived === true || updatedEmp.archived === 1 ? true : false,
      created_at: isNew ? Date.now() : Number(updatedEmp.created_at || Date.now())
    };

    let currentLogs: any[] = [];
    const operatorName = profile?.name || profile?.email || "System/Operator";

    if (!isNew) {
      const original = employees.find((e) => e.id === cleanData.id);
      if (original) {
        try {
          if (original.logs) {
            currentLogs = typeof original.logs === "string" ? JSON.parse(original.logs) : original.logs;
          }
        } catch {}

        const changes: string[] = [];
        const fieldsToCompare = [
          { key: "type", label: "Contract Type" },
          { key: "name", label: "Display Name" },
          { key: "full_name", label: "Full Legal Name" },
          { key: "in", label: "Identity Number (IN)" },
          { key: "pin", label: "App PIN" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "paynow_number", label: "PayNow" },
          { key: "photo_url", label: "Photo" },
          { key: "address", label: "Address" },
          { key: "note", label: "Private Note" },
          { key: "role", label: "Access Roles" },
          { key: "archived", label: "Status" }
        ];

        fieldsToCompare.forEach(({ key, label }) => {
          let origVal = (original as any)[key];
          let newVal = cleanData[key];

          if (key === "archived") {
            origVal = origVal === true || origVal === 1 || String(origVal) === "true" ? "Deactive" : "Active";
            newVal = newVal === true || newVal === 1 || String(newVal) === "true" ? "Deactive" : "Active";
          }

          if (key === "role") {
            let origParsed = [];
            let newParsed = [];
            try {
              if (origVal) origParsed = typeof origVal === "string" ? JSON.parse(origVal) : origVal;
            } catch {}
            try {
              if (newVal) newParsed = typeof newVal === "string" ? JSON.parse(newVal) : newVal;
            } catch {}
            origVal = Array.isArray(origParsed) ? origParsed.sort().join(", ") : "";
            newVal = Array.isArray(newParsed) ? newParsed.sort().join(", ") : "";
          }

          if (String(origVal || "").trim() !== String(newVal || "").trim()) {
            if (key === "pin") {
              changes.push(`${label} changed`);
            } else if (key === "photo_url") {
              changes.push(`${label} updated`);
            } else {
              changes.push(`${label} changed: "${origVal || "none"}" → "${newVal || "none"}"`);
            }
          }
        });

        if (changes.length > 0) {
          const updateLog = {
            action: "Update",
            by: operatorName,
            timestamp: Date.now(),
            details: changes.join("; ")
          };
          currentLogs = [updateLog, ...currentLogs];
        }
      }
    } else {
      const createLog = {
        action: "Create",
        by: operatorName,
        timestamp: Date.now(),
        details: `Created profile for employee "${cleanData.name}".`
      };
      currentLogs = [createLog];
    }

    cleanData.logs = JSON.stringify(currentLogs);

    showToast("Saving employee details...", "info");

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "employees",
          action: isNew ? "insert" : "update",
          data: cleanData
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save employee");

      showToast("Employee details saved successfully!", "success");
      setEmployees((prev) => {
        const idx = prev.findIndex((e) => e.id === cleanData.id);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = cleanData;
          return copy;
        } else {
          return [cleanData, ...prev];
        }
      });
      loadEmployees(true);
    } catch (err: any) {
      showToast("Save failed: " + err.message, "error");
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    showToast("Deleting employee...", "info");

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "employees",
          action: "delete",
          data: { id: empId }
        })
      });

      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete");

      showToast("Employee record deleted successfully!", "success");
      setEmployees((prev) => prev.filter((e) => e.id !== empId));
      loadEmployees(true);
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  const handleToggleArchiveEmployee = async (emp: Employee, toArchive: boolean) => {
    showToast(toArchive ? "Deactivating employee..." : "Activating employee...", "info");

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "employees",
          action: "update",
          data: {
            id: emp.id,
            archived: toArchive
          }
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update status");

      showToast(toArchive ? "Employee deactivated successfully." : "Employee activated successfully.", "success");
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, archived: toArchive } : e));
      loadEmployees(true);
    } catch (err: any) {
      showToast("Update failed: " + err.message, "error");
    }
  };

  const handleViewPinLog = async (emp: Employee) => {
    const operatorName = profile?.name || profile?.email || "System/Operator";
    let currentLogs: any[] = [];
    try {
      if (emp.logs) {
        currentLogs = typeof emp.logs === "string" ? JSON.parse(emp.logs) : emp.logs;
      }
    } catch {}

    const now = Date.now();
    const lastLog = currentLogs[0];
    if (lastLog && lastLog.action === "View PIN" && lastLog.by === operatorName && (now - lastLog.timestamp) < 5000) {
      return;
    }

    const newLog = {
      action: "View PIN",
      by: operatorName,
      timestamp: now,
      details: "Viewed the application login PIN code."
    };

    const updatedLogs = [newLog, ...currentLogs];

    setEmployees((prev) =>
      prev.map((item) => (item.id === emp.id ? { ...item, logs: JSON.stringify(updatedLogs) } : item))
    );

    if (timelineEmployee && timelineEmployee.id === emp.id) {
      setTimelineEmployee((prev) => prev ? { ...prev, logs: JSON.stringify(updatedLogs) } : null);
    }

    try {
      await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "employees",
          action: "update",
          data: {
            id: emp.id,
            logs: JSON.stringify(updatedLogs)
          }
        })
      });
    } catch (err) {
      console.warn("Failed to save PIN view log:", err);
    }
  };

  const isAdminOrManager = profile?.role === "Administrator" || profile?.role === "Manager";

  // Filter based on active tab
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((e) => {
      const isArchived = e.archived === true || e.archived === 1 || String(e.archived) === "true";
      if (activeTab === "Deactive") return isArchived;
      if (isArchived) return false;
      return e.type === activeTab;
    });
  }, [employees, activeTab]);

  const mappedData = React.useMemo(() => {
    return filteredEmployees.map((e) => {
      let parsedRoles: string[] = [];
      try {
        if (e.role) {
          parsedRoles = JSON.parse(e.role);
        }
      } catch (err) {}

      const isArchived = e.archived === true || e.archived === 1 || String(e.archived) === "true";

      let parsedLogs: any[] = [];
      try {
        if (e.logs) {
          parsedLogs = typeof e.logs === "string" ? JSON.parse(e.logs) : e.logs;
        }
      } catch (err) {}

      return {
        ...e,
        name_display: (
          <div className="flex items-center gap-2 select-text">
            {e.photo_url ? (
              <img src={e.photo_url} alt={e.name} className="w-6 h-6 rounded-full object-cover border border-zinc-200" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase">
                {e.name.substring(0, 2)}
              </div>
            )}
            <span className="font-bold text-zinc-900">{e.name}</span>
          </div>
        ),
        roles_display: (
          <div className="flex flex-wrap gap-1 select-none">
            {parsedRoles.length === 0 ? (
              <span className="text-[10px] text-zinc-400 italic font-semibold">No Roles Assigned</span>
            ) : (
              parsedRoles.map((r) => (
                <span key={r} className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#0B57D0] text-[9.5px] font-bold">
                  {r}
                </span>
              ))
            )}
          </div>
        ),
        actions: (
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <button
              onClick={() => setViewingEmployee(e)}
              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer flex items-center justify-center h-6 w-6"
              title="View Employee Card"
            >
              <Contact size={11} />
            </button>
            {isAdminOrManager && (
              <button
                onClick={() => {
                  let rolesArr: string[] = [];
                  try {
                    if (e.role) rolesArr = JSON.parse(e.role);
                  } catch {}
                  setEditingEmployee({ ...e, role: rolesArr, isNew: false });
                }}
                className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 hover:text-[#0B57D0] transition-colors cursor-pointer flex items-center justify-center h-6 w-6"
                title="Edit Profile"
              >
                <Wrench size={11} />
              </button>
            )}
          </div>
        ),
        logs_display: (
          <button
            onClick={() => setTimelineEmployee(e)}
            className="px-2 py-0.5 text-[9.5px] font-bold rounded border border-slate-200 bg-[#F0F4F9] hover:bg-slate-200 text-zinc-700 hover:text-zinc-955 cursor-pointer shadow-xs transition-colors select-none whitespace-nowrap"
          >
            Logs ({parsedLogs.length})
          </button>
        )
      };
    });
  }, [filteredEmployees, isAdminOrManager]);

  const tabs = [
    { id: "Fulltime", label: "Fulltimer", desc: "Manage active full-time contract employees." },
    { id: "Partimer", label: "Partimer", desc: "Manage active part-time contract staff." },
    { id: "Deactive", label: "Deactive Employees", desc: "Access deactivated or suspended employee profiles." }
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      
      {/* 1. TOPBAR NAVIGATION TABS */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId as any)}
        titleSuffix="Registry"
      />

      {/* 2. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            {activeTab === "Deactive" ? "Deactivated Staff Registry" : `${activeTab} Employees Registry`}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "Deactive"
              ? "View and restore former or deactivated employee profiles and security access."
              : `Manage ${activeTab.toLowerCase()} employee accounts, contact details, PayNow numbers, PINs, and application roles.`}
          </p>
        </div>

        {/* Top Header Actions */}
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <CustomButton
              onClick={() => setEditingEmployee({ isNew: true, type: activeTab === "Deactive" ? "Fulltime" : activeTab, name: "", full_name: "", in: "", pin: "", phone: "", email: "", paynow_number: "", photo_url: "", address: "", note: "", role: [] })}
              className="h-8 px-3 text-xs bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
            >
              <UserPlus size={13} />
              Add Employee
            </CustomButton>
          </div>
        )}
      </div>

      {/* 3. DATA TABLE BODY */}
      <div className="flex-1 w-full overflow-hidden min-h-0">
        <DataTable
          columns={columns}
          data={mappedData}
          userRole={isAdminOrManager ? "admin" : "viewer"}
          title={`${activeTab === "Deactive" ? "Deactive" : activeTab + "s"} Registry`}
          fetching={fetching}
          height="h-full"
        />
      </div>

      {editingEmployee && (
        <EmployeeEditModal
          record={editingEmployee}
          onSave={handleSaveEmployee}
          onDelete={handleDeleteEmployee}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {viewingEmployee && (
        <EmployeeCardModal
          employee={viewingEmployee}
          onViewPin={handleViewPinLog}
          onClose={() => setViewingEmployee(null)}
        />
      )}

      {timelineEmployee && (
        <EmployeeLogsTimeline
          employee={timelineEmployee}
          onClose={() => setTimelineEmployee(null)}
        />
      )}
    </div>
  );
}

// Edit Form Dialog Sub-component
interface EditModalProps {
  record: any;
  onSave: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function EmployeeEditModal({ record, onSave, onDelete, onClose }: EditModalProps) {
  const [formData, setFormData] = React.useState({ ...record });
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isNew = !!record.isNew;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Name is required!", "error");
    if (!formData.in.trim()) return showToast("Identity Number (IN) is required!", "error");
    if (!/^\d{4}$/.test(formData.pin)) return showToast("PIN code must be exactly 4 digits!", "error");
    onSave(formData);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filename = `employee_photos/photo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        body: file
      });
      if (!uploadRes.ok) throw new Error("Upload request failed");
      const json = await uploadRes.json();
      if (!json.url) throw new Error("No URL returned from server");

      setFormData((prev: any) => ({ ...prev, photo_url: json.url }));
      showToast("Photo uploaded successfully!", "success");
    } catch (err: any) {
      showToast("Photo upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRoleToggle = (role: string, checked: boolean) => {
    setFormData((prev: any) => {
      const current = prev.role || [];
      if (checked) {
        return { ...prev, role: [...current, role] };
      } else {
        return { ...prev, role: current.filter((r: string) => r !== role) };
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-tableFadeInOnly">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col font-primary"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#F0F4F9]">
          <h3 className="text-base font-bold text-zinc-950">
            {isNew ? "Register Employee Profile" : "Edit Employee Profile"}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-[#001D35] select-none">
            {formData.type === "Fulltime" ? "Fulltimer" : "Partimer"}
          </span>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[70vh] grid grid-cols-2 gap-4 custom-scrollbar select-text">
          {/* Photo upload container */}
          <div className="col-span-2 flex items-center gap-4 bg-zinc-50 p-4 border border-zinc-200 rounded-lg">
            <div className="relative w-16 h-16 rounded-full bg-zinc-150 flex items-center justify-center overflow-hidden border border-zinc-300 shrink-0">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera className="text-zinc-400" size={24} />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Employee Photo</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-white hover:bg-zinc-100 border border-zinc-300 text-xs text-zinc-700 font-bold rounded cursor-pointer transition-colors shadow-xs"
                >
                  {uploading ? "Uploading..." : "Choose File"}
                </button>
                {formData.photo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, photo_url: "" }))}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-xs text-red-700 font-bold rounded cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Basic Details */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Contract Type*</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, type: e.target.value }))}
              className="h-9 px-2.5 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold cursor-pointer w-full"
            >
              <option value="Fulltime">Fulltimer</option>
              <option value="Partimer">Partimer</option>
            </select>
          </div>

          {!isNew ? (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Employee Status*</label>
              <select
                value={formData.archived === true || formData.archived === 1 ? "Deactive" : "Active"}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, archived: e.target.value === "Deactive" }))}
                className="h-9 px-2.5 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold cursor-pointer w-full"
              >
                <option value="Active">Active</option>
                <option value="Deactive">Deactive</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1 select-none pointer-events-none opacity-0">
              <label className="text-[10px]">Spacer</label>
              <div className="h-9"></div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Display Name*</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. John Doe"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Legal Name</label>
            <input
              type="text"
              value={formData.full_name || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, full_name: e.target.value }))}
              placeholder="e.g. Johnathan Doe"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Identity Number (IN)*</label>
            <input
              type="text"
              required
              value={formData.in}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, in: e.target.value }))}
              placeholder="e.g. S9876543A / F9876543N"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">App Login PIN (4-Digit)*</label>
            <input
              type="text"
              required
              maxLength={4}
              pattern="\d{4}"
              value={formData.pin}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, pin: e.target.value.replace(/\D/g, "") }))}
              placeholder="e.g. 1234"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-mono tracking-widest font-bold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Phone</label>
            <input
              type="text"
              value={formData.phone || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g. +65 98765432"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. john.doe@hsg.com"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">PayNow Number</label>
            <input
              type="text"
              value={formData.paynow_number || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, paynow_number: e.target.value }))}
              placeholder="e.g. 98765432"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Resident Address</label>
            <input
              type="text"
              value={formData.address || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))}
              placeholder="e.g. Block 123 Bedok North Ave 4 #04-56"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Private Note</label>
            <textarea
              value={formData.note || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, note: e.target.value }))}
              placeholder="Additional deployment instructions or notes..."
              rows={2}
              className="px-3 py-2 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          {/* Access Roles checkbox selection */}
          <div className="col-span-2 flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-lg p-4 select-none">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Application Access Roles</span>
            <div className="grid grid-cols-3 gap-3">
              {AVAILABLE_ROLES.map((r) => {
                const isChecked = (formData.role || []).includes(r);
                return (
                  <label key={r} className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleRoleToggle(r, e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 focus:ring-2 border-slate-300 cursor-pointer"
                    />
                    {r}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-[#F0F4F9] border-t border-slate-200 select-none">
          <div>
            {!isNew && (formData.archived === true || formData.archived === 1) && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Are you sure you want to permanently delete employee "${formData.name}"? This action cannot be undone.`)) {
                    onClose();
                    await onDelete(formData.id);
                  }
                }}
                className="h-9 px-4 text-xs font-bold rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 transition-colors cursor-pointer"
              >
                Delete Profile
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-955 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <CustomButton
              type="submit"
              disabled={uploading}
              className="h-9 text-xs bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white rounded font-bold"
            >
              Save Employee
            </CustomButton>
          </div>
        </div>
      </form>
    </div>
  );
}

// Employee Profile Card Dialog Sub-component
interface CardModalProps {
  employee: Employee;
  onViewPin: (emp: Employee) => Promise<void>;
  onClose: () => void;
}

function EmployeeCardModal({ employee, onViewPin, onClose }: CardModalProps) {
  const [showPin, setShowPin] = React.useState(false);

  let parsedRoles: string[] = [];
  try {
    if (employee.role) {
      parsedRoles = JSON.parse(employee.role);
    }
  } catch (err) {}

  const isArchived = employee.archived === true || employee.archived === 1 || String(employee.archived) === "true";
  const formattedDate = employee.created_at
    ? new Date(Number(employee.created_at)).toLocaleDateString("en-GB")
    : "N/A";

  const handleTogglePin = async () => {
    if (!showPin) {
      setShowPin(true);
      await onViewPin(employee);
    } else {
      setShowPin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-tableFadeInOnly">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col font-primary select-text">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#F0F4F9] select-none">
          <h3 className="text-base font-bold text-zinc-950">Employee Profile Card</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 font-bold text-lg focus:outline-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[70vh] flex flex-col items-center gap-5 custom-scrollbar">
          {/* Profile Header Image and Status */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-300 shadow-xs">
              {employee.photo_url ? (
                <img src={employee.photo_url} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-50 text-blue-500 flex items-center justify-center text-2xl font-bold uppercase">
                  {employee.name.substring(0, 2)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 select-none">
              <span className="text-sm font-bold text-zinc-900">{employee.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                isArchived ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
              }`}>
                {isArchived ? "Deactive" : "Active"}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest select-none">
              {employee.type === "Fulltime" ? "Full-Time Staff" : "Part-Time Contractor"}
            </span>
          </div>

          <div className="w-full border-t border-zinc-100 my-1"></div>

          {/* Details list */}
          <div className="w-full flex flex-col gap-3.5 text-xs">
            {employee.full_name && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">Full Legal Name</span>
                <span className="font-semibold text-zinc-800">{employee.full_name}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">Identity Number (IN)</span>
                <span className="font-mono font-bold text-zinc-800">{employee.in}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">App PIN Code</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`font-mono text-zinc-800 tracking-widest font-bold ${showPin ? "text-sm" : "text-xs text-zinc-400"}`}>
                    {showPin ? employee.pin : "••••"}
                  </span>
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-350 text-zinc-650 hover:text-zinc-955 transition-colors cursor-pointer select-none"
                    title={showPin ? "Hide PIN" : "Reveal PIN"}
                  >
                    {showPin ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">Phone</span>
                <span className="font-semibold text-zinc-800">{employee.phone || "-"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">PayNow Number</span>
                <span className="font-semibold text-zinc-800">{employee.paynow_number || "-"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">Email</span>
              <span className="font-semibold text-zinc-800 select-all">{employee.email || "-"}</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">Residential Address</span>
              <span className="font-semibold text-zinc-800">{employee.address || "-"}</span>
            </div>

            {employee.note && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">Private Notes</span>
                <span className="font-semibold text-zinc-700 bg-zinc-50 p-2 border border-zinc-150 rounded italic whitespace-pre-wrap">{employee.note}</span>
              </div>
            )}

            <div className="flex flex-col gap-1 select-none">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Application Access Roles</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {parsedRoles.length === 0 ? (
                  <span className="text-[10px] text-zinc-400 italic">No access roles assigned</span>
                ) : (
                  parsedRoles.map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-150 text-[#0B57D0] text-[10px] font-bold">
                      {r}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-0.5 select-none">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Registration Date</span>
              <span className="font-semibold text-zinc-500">{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 bg-[#F0F4F9] border-t border-slate-200 select-none">
          <button
            onClick={onClose}
            className="h-9 px-5 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow-xs cursor-pointer transition-colors"
          >
            Close Card
          </button>
        </div>
      </div>
    </div>
  );
}

// Side Timeline Log Sliding Panel Component
interface TimelineModalProps {
  employee: Employee;
  onClose: () => void;
}

function EmployeeLogsTimeline({ employee, onClose }: TimelineModalProps) {
  const [slideIn, setSlideIn] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setSlideIn(true), 20);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setSlideIn(false);
    setTimeout(onClose, 300);
  };

  let parsedLogs: any[] = [];
  try {
    if (employee.logs) {
      parsedLogs = typeof employee.logs === "string" ? JSON.parse(employee.logs) : employee.logs;
    }
  } catch (err) {}

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity duration-300 ${
          slideIn ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`relative w-[450px] bg-white border-l border-slate-200 shadow-2xl h-screen flex flex-col font-primary z-50 transition-transform duration-300 ease-in-out select-text ${
          slideIn ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-[#F0F4F9]">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-bold text-zinc-950">Audit Timeline Logs</h3>
            <span className="text-xs text-zinc-500 font-semibold">{employee.name} Registry History</span>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-600 font-bold text-xl focus:outline-none cursor-pointer h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {parsedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
              <span className="text-xs italic font-semibold">No audit timeline entries recorded yet.</span>
            </div>
          ) : (
            <div className="relative border-l border-zinc-200 pl-5 ml-2 flex flex-col gap-6">
              {parsedLogs.map((log, index) => {
                const dateStr = log.timestamp
                  ? new Date(log.timestamp).toLocaleString("en-SG", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false
                    })
                  : "N/A";

                let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                if (log.action === "Create") badgeColor = "bg-green-50 text-green-700 border-green-200";
                if (log.action === "View PIN") badgeColor = "bg-amber-50 text-amber-700 border-amber-200";

                return (
                  <div key={index} className="relative flex flex-col gap-1.5 select-text">
                    <div className={`absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                      log.action === "Create" ? "border-green-500" : log.action === "View PIN" ? "border-amber-500" : "border-blue-500"
                    }`} />
                    <div className="flex items-center justify-between text-[10px] select-none">
                      <span className="font-bold text-zinc-400">{dateStr}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase border ${badgeColor}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-800">
                      By: <span className="text-zinc-550 font-semibold">{log.by}</span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-zinc-550 font-medium bg-zinc-50 p-2 border border-zinc-150 rounded italic whitespace-pre-wrap">
                        {log.details}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 bg-[#F0F4F9] border-t border-slate-200 select-none">
          <button
            onClick={handleClose}
            className="h-9 px-5 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow-xs cursor-pointer transition-colors"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
