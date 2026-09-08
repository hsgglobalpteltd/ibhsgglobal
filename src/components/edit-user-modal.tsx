"use client";

import * as React from "react";
import { X, Shield, UserCheck, Link2 } from "lucide-react";
import { CustomButton } from "./custom-button";
import { APP_PAGES_CONFIG } from "@/config/modules-config";
import { ModulePermission, UserModulePermissions } from "@/lib/permissions";

interface EditUserModalProps {
  user: {
    email: string;
    name: string;
    phone_number: string | null;
    role: string;
    pages_access: string[];
    modules_access: any;
    active: number;
    employee_id?: string | null;
  };
  onClose: () => void;
  onSave: (updatedUser: any) => Promise<void>;
}

interface EmployeeOption {
  id: string;
  name: string;
  full_name?: string;
  pin: string;
  phone?: string;
  email?: string;
  archived?: boolean | number;
}

export function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  // Normalize initial role to "Administrator" or "Operator"
  const initialRole = user.role === "Administrator" ? "Administrator" : "Operator";
  const [role, setRole] = React.useState<string>(initialRole);
  const [status, setStatus] = React.useState<number>(user.active);
  const [name, setName] = React.useState<string>(user.name || "");
  const [phone, setPhone] = React.useState<string>(user.phone_number || "");
  const [employeeId, setEmployeeId] = React.useState<string>(user.employee_id || "");

  // Employees list for binding
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = React.useState<boolean>(true);

  // Initialize modular permissions matrix
  const [permissions, setPermissions] = React.useState<UserModulePermissions>(() => {
    const initial: UserModulePermissions = {};

    let modAccess = user.modules_access;
    if (typeof modAccess === "string") {
      try {
        modAccess = JSON.parse(modAccess);
      } catch {
        modAccess = {};
      }
    }

    // Populate all modules from APP_PAGES_CONFIG
    APP_PAGES_CONFIG.forEach((page) => {
      page.modules.forEach((mod) => {
        if (Array.isArray(modAccess)) {
          const has = modAccess.includes(mod.title);
          initial[mod.title] = { view: has, edit: has, delete: has };
        } else if (modAccess && typeof modAccess === "object" && modAccess[mod.title]) {
          const p = modAccess[mod.title];
          initial[mod.title] = {
            view: !!p.view,
            edit: !!p.edit,
            delete: !!p.delete,
          };
        } else {
          initial[mod.title] = { view: false, edit: false, delete: false };
        }
      });
    });

    return initial;
  });

  const [saving, setSaving] = React.useState(false);

  // Fetch employees list for binding
  React.useEffect(() => {
    let isMounted = true;
    async function loadEmployees() {
      try {
        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/employees");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            const activeList = data.filter((e: any) => {
              const isArch = e.archived === true || e.archived === 1 || String(e.archived) === "true";
              return !isArch;
            });
            setEmployees(activeList);
          }
        }
      } catch (err) {
        console.warn("Failed to load employees for binding dropdown:", err);
      } finally {
        if (isMounted) setLoadingEmployees(false);
      }
    }
    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePermission = (
    moduleTitle: string,
    action: "view" | "edit" | "delete",
    checked: boolean
  ) => {
    setPermissions((prev) => {
      const current = prev[moduleTitle] || { view: false, edit: false, delete: false };
      const updated: ModulePermission = { ...current };

      if (action === "view") {
        updated.view = checked;
        // If view is disabled, edit and delete must also be disabled
        if (!checked) {
          updated.edit = false;
          updated.delete = false;
        }
      } else if (action === "edit") {
        updated.edit = checked;
        // If edit is enabled, view must automatically be enabled
        if (checked) {
          updated.view = true;
        }
      } else if (action === "delete") {
        updated.delete = checked;
        // If delete is enabled, view must automatically be enabled
        if (checked) {
          updated.view = true;
        }
      }

      return {
        ...prev,
        [moduleTitle]: updated,
      };
    });
  };

  const handleQuickPageAction = (pageId: string, actionType: "all" | "view_only" | "none") => {
    const pageObj = APP_PAGES_CONFIG.find((p) => p.id === pageId);
    if (!pageObj) return;

    setPermissions((prev) => {
      const updated = { ...prev };
      pageObj.modules.forEach((mod) => {
        if (actionType === "all") {
          updated[mod.title] = { view: true, edit: true, delete: true };
        } else if (actionType === "view_only") {
          updated[mod.title] = { view: true, edit: false, delete: false };
        } else {
          updated[mod.title] = { view: false, edit: false, delete: false };
        }
      });
      return updated;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Calculate active pages where at least one module has view=true
      const calculatedPages: string[] = ["Dashboard"];
      APP_PAGES_CONFIG.forEach((page) => {
        const hasActiveModule = page.modules.some((mod) => permissions[mod.title]?.view);
        if (hasActiveModule && !calculatedPages.includes(page.id)) {
          calculatedPages.push(page.id);
        }
      });

      await onSave({
        ...user,
        name,
        phone_number: phone || null,
        role,
        active: status,
        employee_id: employeeId || null,
        pages_access: role === "Administrator" ? [] : calculatedPages,
        modules_access: role === "Administrator" ? {} : permissions,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none font-primary animate-tableFadeInOnly">
      {/* Modal Container */}
      <form 
        onSubmit={handleFormSubmit}
        className="w-full max-w-5xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-tableFadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div>
            <h3 className="text-base font-bold text-zinc-950">Edit User Permissions</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Configure role access, employee PIN binding, and granular module permissions.</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
          {/* Top User Meta Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/60 p-4 border border-slate-200 rounded-lg">
            {/* 1. Account Info */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">User Account Info</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">Full Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">Email (Read Only)</label>
                <input 
                  type="email"
                  disabled
                  value={user.email}
                  className="h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-zinc-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* 2. Security Role & Status */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Access Controls</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">Security Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value="Administrator">Administrator (Full Access)</option>
                  <option value="Operator">Operator (Granular Permissions)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">Account Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value={1}>Active (Approved)</option>
                  <option value={0}>Pending (Awaiting Approval)</option>
                  <option value={2}>Blocked (Suspended)</option>
                </select>
              </div>
            </div>

            {/* 3. Employee Binding for PIN Fast Login */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5">
                <Link2 size={12} className="text-zinc-500" />
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Employee PIN Binding</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">Bound Employee</label>
                <select 
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={loadingEmployees}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value="">-- No Employee Bound --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.full_name ? `(${emp.full_name})` : ""} — PIN: {emp.pin || "None"}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Binding allows the user to log in instantly on the login screen with the employee's 4-digit PIN code.
              </p>
            </div>
          </div>

          {/* Granular Permission Matrix Section */}
          {role === "Administrator" ? (
            <div className="flex-1 min-h-[260px] border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200 flex items-center justify-center">
                <Shield size={24} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">Administrator Full System Access</h4>
              <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                Users with the Administrator role are automatically granted full unrestricted access to all pages, modules, settings, and CRUD actions (View, Create, Edit, Delete).
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg bg-white flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-[#0B57D0]" />
                  <span className="text-xs font-bold text-zinc-900">Operator Module Permissions Matrix</span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Configure specific View, Create/Edit, and Delete permissions per module
                </span>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse font-primary">
                  <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Workspace / Module</th>
                      <th className="py-2.5 px-3 text-center w-24">View</th>
                      <th className="py-2.5 px-3 text-center w-28">Create / Edit</th>
                      <th className="py-2.5 px-3 text-center w-24">Delete</th>
                      <th className="py-2.5 px-4 text-right w-48">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {APP_PAGES_CONFIG.filter((p) => p.id !== "Administrator" && p.modules.length > 0).map((page) => (
                      <React.Fragment key={page.id}>
                        {/* Page Category Header Row */}
                        <tr className="bg-slate-50/80 border-t border-slate-200">
                          <td colSpan={4} className="py-2 px-4 font-bold text-zinc-900 text-xs">
                            {page.label}
                          </td>
                          <td className="py-1 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickPageAction(page.id, "all")}
                                className="px-2 py-0.5 text-[9px] font-bold rounded bg-white border border-slate-200 hover:bg-slate-100 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
                              >
                                All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPageAction(page.id, "view_only")}
                                className="px-2 py-0.5 text-[9px] font-bold rounded bg-white border border-slate-200 hover:bg-slate-100 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
                              >
                                View Only
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPageAction(page.id, "none")}
                                className="px-2 py-0.5 text-[9px] font-bold rounded bg-white border border-slate-200 hover:bg-slate-100 text-zinc-700 transition-colors cursor-pointer shadow-2xs"
                              >
                                Clear
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Modules under this page */}
                        {page.modules.map((mod) => {
                          const perm = permissions[mod.title] || { view: false, edit: false, delete: false };
                          return (
                            <tr key={mod.title} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-6">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-zinc-900 text-xs">{mod.title}</span>
                                  <span className="text-[10px] text-zinc-500 truncate max-w-md">{mod.description}</span>
                                </div>
                              </td>
                              {/* View Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.view}
                                  onChange={(e) => handleTogglePermission(mod.title, "view", e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                                />
                              </td>
                              {/* Edit Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.edit}
                                  onChange={(e) => handleTogglePermission(mod.title, "edit", e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                                />
                              </td>
                              {/* Delete Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.delete}
                                  onChange={(e) => handleTogglePermission(mod.title, "delete", e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]/20 cursor-pointer accent-[#0B57D0]"
                                />
                              </td>
                              {/* Module Quick Actions */}
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissions((prev) => ({
                                        ...prev,
                                        [mod.title]: { view: true, edit: true, delete: true },
                                      }))
                                    }
                                    className="px-1.5 py-0.5 text-[9.5px] text-[#0B57D0] hover:text-[#0842A0] font-semibold hover:underline cursor-pointer"
                                  >
                                    Full
                                  </button>
                                  <span className="text-slate-300 text-[10px]">|</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissions((prev) => ({
                                        ...prev,
                                        [mod.title]: { view: true, edit: false, delete: false },
                                      }))
                                    }
                                    className="px-1.5 py-0.5 text-[9.5px] text-zinc-600 hover:text-zinc-950 font-semibold hover:underline cursor-pointer"
                                  >
                                    View
                                  </button>
                                  <span className="text-slate-300 text-[10px]">|</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissions((prev) => ({
                                        ...prev,
                                        [mod.title]: { view: false, edit: false, delete: false },
                                      }))
                                    }
                                    className="px-1.5 py-0.5 text-[9.5px] text-zinc-500 hover:text-red-600 font-semibold hover:underline cursor-pointer"
                                  >
                                    Off
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            disabled={saving}
            className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 hover:text-zinc-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
