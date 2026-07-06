"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, X, Shield, ArrowRight } from "lucide-react";
import { CustomButton } from "./custom-button";
import { APP_PAGES_CONFIG } from "@/config/modules-config";

interface EditUserModalProps {
  user: {
    email: string;
    name: string;
    phone_number: string | null;
    role: string;
    pages_access: string[];
    modules_access: string[];
    active: number;
  };
  onClose: () => void;
  onSave: (updatedUser: any) => Promise<void>;
}

const AVAILABLE_PAGES = APP_PAGES_CONFIG.map((p) => ({
  id: p.id,
  label: p.label,
  modules: p.modules.map((m) => m.title),
}));

export function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [role, setRole] = React.useState<string>(user.role);
  const [status, setStatus] = React.useState<number>(user.active);
  const [name, setName] = React.useState<string>(user.name || "");
  const [phone, setPhone] = React.useState<string>(user.phone_number || "");
  
  // Track assigned pages and modules
  const [assignedPages, setAssignedPages] = React.useState<string[]>(user.pages_access);
  const [assignedModules, setAssignedModules] = React.useState<string[]>(user.modules_access);
  
  // Track expanded pages on the left panel
  const [expandedPages, setExpandedPages] = React.useState<Record<string, boolean>>({
    Frontline: true,
    Database: true
  });

  const [saving, setSaving] = React.useState(false);

  const togglePageExpand = (pageId: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId]
    }));
  };

  // Drag start handler
  const handleDragStart = (e: React.DragEvent, type: "page" | "module", id: string, parentPageId?: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ type, id, parentPageId }));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  // Drop handler on the right panel
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      const { type, id, parentPageId } = JSON.parse(dataStr);

      if (type === "page") {
        // Assign page and all its sub-modules
        const targetPage = AVAILABLE_PAGES.find((p) => p.id === id);
        if (targetPage) {
          setAssignedPages((prev) => (prev.includes(id) ? prev : [...prev, id]));
          if (targetPage.modules.length > 0) {
            setAssignedModules((prev) => {
              const next = [...prev];
              targetPage.modules.forEach((mod) => {
                if (!next.includes(mod)) next.push(mod);
              });
              return next;
            });
          }
        }
      } else if (type === "module" && parentPageId) {
        // Assign module and automatically assign the parent page if not present
        setAssignedPages((prev) => (prev.includes(parentPageId) ? prev : [...prev, parentPageId]));
        setAssignedModules((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    } catch (err) {
      console.error("Failed to process drop:", err);
    }
  };

  // Remove assigned page (and optionally all its modules)
  const removePage = (pageId: string) => {
    setAssignedPages((prev) => prev.filter((p) => p !== pageId));
    // Also strip out any modules belonging to this page
    const targetPage = AVAILABLE_PAGES.find((p) => p.id === pageId);
    if (targetPage && targetPage.modules.length > 0) {
      setAssignedModules((prev) => prev.filter((m) => !targetPage.modules.includes(m)));
    }
  };

  // Remove individual assigned module
  const removeModule = (moduleId: string) => {
    setAssignedModules((prev) => prev.filter((m) => m !== moduleId));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...user,
        name,
        phone_number: phone || null,
        role,
        active: status,
        pages_access: assignedPages,
        modules_access: assignedModules
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
        className="w-full max-w-4xl bg-[#E5E5E5] border border-zinc-300 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-300 bg-[#EEEEEE]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-700 rounded-lg text-white">
              <Shield size={18} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-zinc-950">Edit User Permissions</h3>
              <p className="text-xs text-zinc-500">Assign role access rules and modular permissions</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-300/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* User Meta Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#EEEEEE]/50 p-4 border border-zinc-300/60 rounded-lg">
            {/* Left Box: Name, Phone & Email */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">User Account Info</span>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500">Full Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500">Phone Number</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Not set"
                    className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500">Email (Read Only)</label>
                  <input 
                    type="email"
                    disabled
                    value={user.email}
                    className="h-9 px-3 bg-[#EEEEEE]/60 border border-zinc-300 rounded-lg text-sm text-zinc-500 cursor-not-allowed font-medium"
                  />
                </div>
              </div>
            </div>
            
            {/* Right Box: Role & Status */}
            <div className="flex flex-col gap-3 justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">System Permissions</span>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Security Role</label>
                <select 
                  value={role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setRole(newRole);
                    if (newRole === "Administrator") {
                      setAssignedPages([]);
                      setAssignedModules([]);
                    }
                  }}
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold cursor-pointer"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Manager">Manager</option>
                  <option value="Operator">Operator</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold cursor-pointer"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Pending</option>
                  <option value={2}>Blocked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Drag and Drop Module Area */}
          {role === "Administrator" ? (
            <div className="flex-1 min-h-[350px] border border-zinc-300 rounded-lg bg-[#EEEEEE]/50 flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="p-3 bg-zinc-700 rounded-full text-white">
                <Shield size={24} />
              </div>
              <h4 className="text-sm font-bold text-zinc-800">Administrator Full Access</h4>
              <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                Users with the Administrator role are automatically granted full system access to all pages and modules. Custom page/module permissions are not required and have been cleared.
              </p>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[350px]">
              {/* Left Box: Available Permissions */}
              <div className="border border-zinc-300 rounded-lg bg-[#EEEEEE]/50 flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 bg-[#EEEEEE] border-b border-zinc-300 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Available Pages & Modules</span>
                  <span className="text-[10px] text-zinc-400 italic">Drag items to assign</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {AVAILABLE_PAGES.map((page) => {
                    const isExpanded = expandedPages[page.id] ?? false;
                    const hasModules = page.modules.length > 0;
                    
                    return (
                      <div key={page.id} className="flex flex-col gap-1">
                        {/* Page Row */}
                        <div 
                          draggable
                          onDragStart={(e) => handleDragStart(e, "page", page.id)}
                          className="flex items-center justify-between p-2.5 bg-[#E5E5E5] hover:bg-[#D5D5D5] border border-zinc-300 rounded-lg cursor-grab active:cursor-grabbing transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            {hasModules ? (
                              <button
                                type="button"
                                onClick={() => togglePageExpand(page.id)}
                                className="p-0.5 hover:bg-zinc-300 rounded-md text-zinc-500"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <span className="text-xs font-bold text-zinc-800">{page.label}</span>
                          </div>
                          <span className="text-[9px] uppercase font-semibold text-zinc-400 bg-zinc-300/40 px-2 py-0.5 rounded-md group-hover:bg-zinc-300 transition-colors font-footer">
                            Page
                          </span>
                        </div>

                        {/* Modules sub-tree */}
                        {hasModules && isExpanded && (
                          <div className="pl-7 pr-1 flex flex-col gap-1 border-l-2 border-zinc-300/60 ml-2.5 mt-0.5">
                            {page.modules.map((mod) => (
                              <div
                                key={mod}
                                draggable
                                onDragStart={(e) => handleDragStart(e, "module", mod, page.id)}
                                className="flex items-center justify-between p-2 bg-[#E5E5E5] hover:bg-[#D8D8D8] border border-zinc-300/50 rounded-lg cursor-grab active:cursor-grabbing text-xs text-zinc-600 font-medium transition-colors"
                              >
                                <span>{mod}</span>
                                <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider font-footer">Module</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Box: Assigned Target */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-zinc-300 rounded-lg bg-[#EEEEEE]/30 flex flex-col overflow-hidden transition-colors hover:bg-[#EEEEEE]/50"
              >
                <div className="px-4 py-2.5 bg-[#EEEEEE]/85 border-b border-zinc-300 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Assigned Permissions</span>
                  <span className="text-[10px] text-zinc-400 italic">Drop here to assign</span>
                </div>
                
                {assignedPages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 gap-2">
                    <ArrowRight className="w-8 h-8 text-zinc-300 animate-pulse" />
                    <span className="text-xs font-semibold">No permissions assigned yet</span>
                    <p className="text-[10px] text-zinc-400 max-w-[200px] leading-relaxed">
                      Drag pages or individual modules from the left and drop them here.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {assignedPages.map((pageId) => {
                      const pageObj = AVAILABLE_PAGES.find((p) => p.id === pageId);
                      if (!pageObj) return null;
                      
                      // Filter modules assigned to this page
                      const pageAssignedMods = pageObj.modules.filter((m) => assignedModules.includes(m));

                      return (
                        <div key={pageId} className="border border-zinc-300/80 rounded-lg bg-[#E5E5E5] p-3 flex flex-col gap-2">
                          {/* Page Header */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-800">{pageObj.label}</span>
                            <button
                              type="button"
                              onClick={() => removePage(pageId)}
                              className="p-1 hover:bg-zinc-300 text-zinc-500 hover:text-red-600 rounded-md transition-colors"
                              title="Remove entire page"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* Modules pills */}
                          {pageAssignedMods.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 border-t border-zinc-300/60 pt-2">
                              {pageAssignedMods.map((mod) => (
                                <div 
                                  key={mod}
                                  className="flex items-center gap-1 bg-[#EEEEEE] border border-zinc-300 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-zinc-600"
                                >
                                  <span>{mod}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeModule(mod)}
                                    className="text-zinc-400 hover:text-red-500 font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
