"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { NavigationTabs } from "../navigation-tabs";
import { Wrench, UserPlus, Eye, EyeOff, Camera, Trash2, ShieldAlert, Contact, X, History } from "lucide-react";

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
    { id: "name", header: "Name", accessor: "name_display" },
    { id: "full_name", header: "Full Name", accessor: "full_name" },
    { id: "in", header: "Identity Number (IN)", accessor: "in" },
    { id: "phone", header: "Phone", accessor: "phone" },
    { id: "email", header: "Email", accessor: "email" },
    { id: "paynow_number", header: "PayNow Number", accessor: "paynow_number" },
    { id: "roles_list", header: "Application Access Roles", accessor: "roles_display" },
    { id: "logs", header: "Logs", accessor: "logs_display" }
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
            <button
              onClick={() => setViewingEmployee(e)}
              className="w-6 h-6 rounded-md bg-white hover:bg-slate-100 text-zinc-500 hover:text-[#0B57D0] border border-slate-200 shadow-2xs flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="View Employee Card"
            >
              <Contact size={13} />
            </button>
            <span className="font-medium text-zinc-900">{e.name}</span>
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
        logs_display: (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setTimelineEmployee(e)}
              className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 border border-slate-200 shadow-2xs flex items-center justify-center transition-colors cursor-pointer"
              title={`View Logs (${parsedLogs.length})`}
            >
              <History size={14} />
            </button>
          </div>
        )
      };
    });
  }, [filteredEmployees]);

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
          addNewText="Add Employee"
          onAddNew={isAdminOrManager ? () => {
            setEditingEmployee({
              isNew: true,
              type: activeTab === "Deactive" ? "Fulltime" : activeTab,
              name: "",
              full_name: "",
              in: "",
              pin: "",
              phone: "",
              email: "",
              paynow_number: "",
              photo_url: "",
              address: "",
              note: "",
              role: []
            });
          } : undefined}
          onEditRow={isAdminOrManager ? (row) => {
            let rolesArr: string[] = [];
            try {
              if (row.role) rolesArr = JSON.parse(row.role);
            } catch {}
            setEditingEmployee({ ...row, role: rolesArr, isNew: false });
          } : undefined}
          onDeleteRow={isAdminOrManager ? (rowId) => {
            handleDeleteEmployee(rowId);
          } : undefined}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-tableFadeInOnly">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-lg shadow-xl flex flex-col overflow-hidden animate-tableFadeIn font-primary">
        {/* Dialog Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              {isNew ? "Add Employee" : "Edit Employee Profile"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure contract type, contact details, PayNow, PIN, and role permissions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dialog Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)] space-y-4">
            
            {/* 1:1 Photo Uploader on top */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Employee Photo</label>
              <div className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                <div className="w-20 h-20 aspect-square rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-zinc-400 p-1">
                      <Camera size={18} className="mx-auto mb-0.5 opacity-50" />
                      <span className="text-[10px] block leading-tight font-medium">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                    >
                      <Camera size={13} />
                      {uploading ? "Uploading..." : formData.photo_url ? "Change Photo" : "Upload Photo"}
                    </button>
                    {formData.photo_url && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, photo_url: "" }))}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 transition-all cursor-pointer shadow-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">Square employee avatar / badge photo</span>
                </div>
              </div>
            </div>

            {/* Contract Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Contract Type*</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, type: e.target.value }))}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value="Fulltime">Fulltimer</option>
                  <option value="Partimer">Partimer</option>
                </select>
              </div>

              {!isNew ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Employee Status*</label>
                  <select
                    value={formData.archived === true || formData.archived === 1 ? "Deactive" : "Active"}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, archived: e.target.value === "Deactive" }))}
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Deactive">Deactive</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">App Login PIN (4-Digit)*</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={formData.pin}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, pin: e.target.value.replace(/\D/g, "") }))}
                    placeholder="e.g. 1234"
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-mono tracking-widest font-bold transition-all"
                  />
                </div>
              )}
            </div>

            {/* Display Name & Full Legal Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Display Name*</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Full Legal Name</label>
                <input
                  type="text"
                  value={formData.full_name || ""}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>

            {/* Identity Number & PIN Code (if not new) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Identity Number (IN)*</label>
                <input
                  type="text"
                  required
                  value={formData.in}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, in: e.target.value }))}
                  placeholder="e.g. S9876543A / F9876543N"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              {!isNew ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">App Login PIN (4-Digit)*</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={formData.pin}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, pin: e.target.value.replace(/\D/g, "") }))}
                    placeholder="e.g. 1234"
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-mono tracking-widest font-bold transition-all"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">PayNow Number</label>
                  <input
                    type="text"
                    value={formData.paynow_number || ""}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, paynow_number: e.target.value }))}
                    placeholder="e.g. 98765432"
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                  />
                </div>
              )}
            </div>

            {/* Phone, Email & PayNow */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Phone</label>
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +65 98765432"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Email</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. john.doe@hsg.com"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>

            {!isNew && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">PayNow Number</label>
                <input
                  type="text"
                  value={formData.paynow_number || ""}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, paynow_number: e.target.value }))}
                  placeholder="e.g. 98765432"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            )}

            {/* Resident Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Resident Address</label>
              <input
                type="text"
                value={formData.address || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. Block 123 Bedok North Ave 4 #04-56"
                className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
              />
            </div>

            {/* Private Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Private Note</label>
              <textarea
                value={formData.note || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, note: e.target.value }))}
                placeholder="Additional deployment instructions or notes..."
                rows={2}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium resize-none transition-all"
              />
            </div>

            {/* Access Roles checkbox selection */}
            <div className="flex flex-col gap-2 bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 select-none">
              <span className="text-xs font-semibold text-zinc-600">Application Access Roles</span>
              <div className="grid grid-cols-4 gap-2.5 pt-1">
                {AVAILABLE_ROLES.map((r) => {
                  const isChecked = (formData.role || []).includes(r);
                  return (
                    <label key={r} className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleRoleToggle(r, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                      />
                      <span>{r}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
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
                  className="h-9 px-3.5 text-xs font-semibold rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer shadow-xs"
                >
                  Delete Profile
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 hover:text-zinc-950 transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
              >
                Save Employee
              </button>
            </div>
          </div>
        </form>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-tableFadeInOnly">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col font-primary select-text animate-tableFadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white select-none">
          <div>
            <h3 className="text-base font-bold text-zinc-950">Employee Profile Card</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Contact credentials, security PIN, and application roles.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[75vh] flex flex-col gap-5 custom-scrollbar">
          {/* Profile Header Image and Status */}
          <div className="flex items-center gap-4 p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-200 shadow-2xs shrink-0">
              {employee.photo_url ? (
                <img src={employee.photo_url} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-50 text-[#0B57D0] flex items-center justify-center text-xl font-bold uppercase">
                  {employee.name.substring(0, 2)}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 select-none">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-950">{employee.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isArchived ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  {isArchived ? "Deactive" : "Active"}
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-semibold">
                {employee.type === "Fulltime" ? "Full-Time Staff" : "Part-Time Contractor"} • Registered {formattedDate}
              </span>
            </div>
          </div>

          {/* Details 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {employee.full_name && (
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-[11px] font-semibold text-zinc-500 select-none">Full Legal Name</span>
                <span className="font-semibold text-zinc-900 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-200">{employee.full_name}</span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-zinc-500 select-none">Identity Number (IN)</span>
              <span className="font-mono font-bold text-zinc-900 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-200">{employee.in}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-zinc-500 select-none">App PIN Code</span>
              <div className="flex items-center justify-between bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className={`font-mono text-zinc-900 tracking-widest font-bold ${showPin ? "text-sm" : "text-xs text-zinc-400"}`}>
                  {showPin ? employee.pin : "••••"}
                </span>
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer select-none shadow-2xs"
                  title={showPin ? "Hide PIN" : "Reveal PIN"}
                >
                  {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-zinc-500 select-none">Phone</span>
              <span className="font-medium text-zinc-800 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-200">{employee.phone || "-"}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-zinc-500 select-none">PayNow Number</span>
              <span className="font-medium text-zinc-800 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-200">{employee.paynow_number || "-"}</span>
            </div>

            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-[11px] font-semibold text-zinc-500 select-none">Email</span>
              <span className="font-medium text-zinc-800 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-200 select-all">{employee.email || "-"}</span>
            </div>

            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-[11px] font-semibold text-zinc-500 select-none">Residential Address</span>
              <span className="font-medium text-zinc-800 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-200">{employee.address || "-"}</span>
            </div>

            {employee.note && (
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-[11px] font-semibold text-zinc-500 select-none">Private Notes</span>
                <span className="font-medium text-zinc-700 bg-slate-50 p-3 border border-slate-200 rounded-lg italic whitespace-pre-wrap">{employee.note}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5 col-span-2 select-none">
              <span className="text-[11px] font-semibold text-zinc-500">Application Access Roles</span>
              <div className="flex flex-wrap gap-1.5 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                {parsedRoles.length === 0 ? (
                  <span className="text-xs text-zinc-400 italic">No access roles assigned</span>
                ) : (
                  parsedRoles.map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#0B57D0] text-xs font-semibold">
                      {r}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200 select-none shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs active:scale-98"
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
