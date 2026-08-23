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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 select-none font-primary animate-fade-in">
      {/* Modal Container */}
      <form 
        onSubmit={handleFormSubmit}
        className="w-full max-w-5xl bg-[#E5E5E5] border border-zinc-300 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-300 bg-[#EEEEEE]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-700 rounded-lg text-white">
              <Shield size={18} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-zinc-950">Edit User Permissions</h3>
              <p className="text-xs text-zinc-500">Configure role access, employee fast login binding, and granular CRUD permissions</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-300/40 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Top User Meta Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-[#EEEEEE]/60 p-4 border border-zinc-300/70 rounded-lg">
            {/* 1. Account Info */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">User Account Info</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500">Full Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500">Email (Read Only)</label>
                <input 
                  type="email"
                  disabled
                  value={user.email}
                  className="h-9 px-3 bg-[#EEEEEE]/60 border border-zinc-300 rounded-lg text-xs text-zinc-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* 2. Security Role & Status */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Access Controls</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Security Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold cursor-pointer"
                >
                  <option value="Administrator">Administrator (Full Access)</option>
                  <option value="Operator">Operator (Granular Permissions)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Account Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold cursor-pointer"
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
                <label className="text-[10px] font-bold text-zinc-500">Bound Employee</label>
                <select 
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={loadingEmployees}
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold cursor-pointer"
                >
                  <option value="">-- No Employee Bound --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.full_name ? `(${emp.full_name})` : ""} — PIN: {emp.pin || "None"}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">
                Binding allows the user to log in instantly on the login screen with the employee's 4-digit PIN code.
              </p>
            </div>
          </div>

          {/* Granular Permission Matrix Section */}
          {role === "Administrator" ? (
            <div className="flex-1 min-h-[300px] border border-zinc-300 rounded-lg bg-[#EEEEEE]/50 flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="p-3 bg-zinc-700 rounded-full text-white">
                <Shield size={26} />
              </div>
              <h4 className="text-sm font-bold text-zinc-800">Administrator Full System Access</h4>
              <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                Users with the Administrator role are automatically granted full unrestricted access to all pages, modules, settings, and CRUD actions (View, Create, Edit, Delete).
              </p>
            </div>
          ) : (
            <div className="border border-zinc-300 rounded-lg bg-[#EEEEEE]/50 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-[#EEEEEE] border-b border-zinc-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-zinc-700" />
                  <span className="text-xs font-bold text-zinc-800">Operator Module Permissions Matrix</span>
                </div>
                <span className="text-[10px] text-zinc-500 italic">
                  Configure specific View, Create/Edit, and Delete permissions per module
                </span>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse font-primary">
                  <thead className="bg-[#E5E5E5] sticky top-0 z-10 border-b border-zinc-300 text-zinc-700 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Workspace / Module</th>
                      <th className="py-2.5 px-3 text-center w-24">View</th>
                      <th className="py-2.5 px-3 text-center w-28">Create / Edit</th>
                      <th className="py-2.5 px-3 text-center w-24">Delete</th>
                      <th className="py-2.5 px-4 text-right w-48">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300/60 bg-[#EEEEEE]/20">
                    {APP_PAGES_CONFIG.filter((p) => p.id !== "Administrator" && p.modules.length > 0).map((page) => (
                      <React.Fragment key={page.id}>
                        {/* Page Category Header Row */}
                        <tr className="bg-[#E5E5E5]/70 border-t border-zinc-300">
                          <td colSpan={4} className="py-2 px-4 font-bold text-zinc-900 text-xs">
                            {page.label}
                          </td>
                          <td className="py-1 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickPageAction(page.id, "all")}
                                className="px-2 py-0.5 text-[9px] font-bold rounded bg-zinc-300 hover:bg-zinc-400 text-zinc-800 transition-colors cursor-pointer"
                              >
                                All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPageAction(page.id, "view_only")}
                                className="px-2 py-0.5 text-[9px] font-bold rounded bg-zinc-300 hover:bg-zinc-400 text-zinc-800 transition-colors cursor-pointer"
                              >
                                View Only
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPageAction(page.id, "none")}
                                className="px-2 py-0.5 text-[9px] font-bold rounded bg-zinc-300 hover:bg-zinc-400 text-zinc-800 transition-colors cursor-pointer"
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
                            <tr key={mod.title} className="hover:bg-zinc-200/50 transition-colors">
                              <td className="py-2 px-6">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-zinc-800 text-xs">{mod.title}</span>
                                  <span className="text-[10px] text-zinc-500 truncate max-w-md">{mod.description}</span>
                                </div>
                              </td>
                              {/* View Checkbox */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.view}
                                  onChange={(e) => handleTogglePermission(mod.title, "view", e.target.checked)}
                                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer accent-zinc-800"
                                />
                              </td>
                              {/* Edit Checkbox */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.edit}
                                  onChange={(e) => handleTogglePermission(mod.title, "edit", e.target.checked)}
                                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer accent-zinc-800"
                                />
                              </td>
                              {/* Delete Checkbox */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.delete}
                                  onChange={(e) => handleTogglePermission(mod.title, "delete", e.target.checked)}
                                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer accent-zinc-800"
                                />
                              </td>
                              {/* Module Quick Actions */}
                              <td className="py-2 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissions((prev) => ({
                                        ...prev,
                                        [mod.title]: { view: true, edit: true, delete: true },
                                      }))
                                    }
                                    className="px-1.5 py-0.5 text-[9px] text-zinc-600 hover:text-zinc-950 font-semibold hover:underline cursor-pointer"
                                  >
                                    Full
                                  </button>
                                  <span className="text-zinc-300 text-[10px]">|</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissions((prev) => ({
                                        ...prev,
                                        [mod.title]: { view: true, edit: false, delete: false },
                                      }))
                                    }
                                    className="px-1.5 py-0.5 text-[9px] text-zinc-600 hover:text-zinc-950 font-semibold hover:underline cursor-pointer"
                                  >
                                    View
                                  </button>
                                  <span className="text-zinc-300 text-[10px]">|</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissions((prev) => ({
                                        ...prev,
                                        [mod.title]: { view: false, edit: false, delete: false },
                                      }))
                                    }
                                    className="px-1.5 py-0.5 text-[9px] text-zinc-600 hover:text-zinc-950 font-semibold hover:underline cursor-pointer"
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-300 bg-[#EEEEEE]">
          <CustomButton 
            type="button" 
            variant="default" 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </CustomButton>
          <CustomButton 
            type="submit" 
            variant="dark" 
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </CustomButton>
        </div>
      </form>
    </div>
  );
}
