"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

export function TiktokTerminalModule({ profile }: { profile?: any }) {
  // Terminal states
  const [terminals, setTerminals] = React.useState<any[]>([]);
  const [fetchingTerminals, setFetchingTerminals] = React.useState(true);
  const [editingTerminal, setEditingTerminal] = React.useState<any | null>(null);
  const [showAddTerminal, setShowAddTerminal] = React.useState(false);

  const terminalColumns: Column[] = [
    { id: "ip", header: "IP Address", accessor: "ip" },
    { id: "name", header: "Terminal Name", accessor: "name" },
    { id: "pin", header: "PIN Code (4-digit)", accessor: "pin" },
    { id: "allowed_pages_label", header: "Allowed Pages", accessor: "allowed_pages_label" },
    { id: "auto_print_label", header: "Auto Print AWB", accessor: "auto_print_label" },
  ];

  const loadTerminals = React.useCallback(async () => {
    setFetchingTerminals(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/tiktok/terminals`);
      if (!res.ok) throw new Error("Failed to fetch terminals");
      const data = (await res.json()) as any[];
      setTerminals(data.map(t => ({
        ...t,
        id: t.ip, // Required by DataTable primary key check
        allowed_pages_label: JSON.parse(t.allowed_pages || "[]").join(", "),
        auto_print_label: t.auto_print ? "Enabled" : "Disabled"
      })));
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setFetchingTerminals(false);
    }
  }, []);

  React.useEffect(() => {
    loadTerminals();
  }, [loadTerminals]);

  // Global db-refresh listener
  React.useEffect(() => {
    const handleDbRefresh = () => {
      loadTerminals();
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadTerminals]);

  // Terminal API operations
  const handleSaveTerminal = async (terminalData: any, isEdit: boolean) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/tiktok/terminals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEdit ? "edit" : "add",
          terminal: {
            ip: terminalData.ip,
            name: terminalData.name,
            pin: terminalData.pin,
            allowed_pages: JSON.stringify(terminalData.allowed_pages),
            auto_print: !!terminalData.auto_print
          }
        })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(`Terminal ${isEdit ? "updated" : "added"} successfully`, "success");
      setEditingTerminal(null);
      setShowAddTerminal(false);
      loadTerminals();
    } catch (err: any) {
      showToast(err.message || "Failed to save terminal", "error");
    }
  };

  const handleDeleteTerminal = async (row: any) => {
    const ip = typeof row === "string" ? row : row?.ip;
    if (!ip) {
      showToast("Cannot delete terminal: missing IP address", "error");
      return;
    }
    try {
      const res = await fetch(`${WORKER_URL}/api/tiktok/terminals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          terminal: { ip }
        })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Terminal deleted successfully", "success");
      loadTerminals();
    } catch (err: any) {
      showToast(err.message || "Failed to delete terminal", "error");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0">
      <div className="content-header flex justify-between items-center pr-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-primary text-base font-bold text-zinc-900">
            Tiktok Terminals
          </h3>
          <p className="font-primary text-xs text-zinc-500">
            Configure authorized computer terminals, IP addresses, screen permissions, and Auto Print.
          </p>
        </div>
        <button 
          onClick={() => setShowAddTerminal(true)}
          className="px-3 py-1.5 bg-[#0b57d0] text-white text-xs font-bold rounded-lg hover:bg-[#0842a0] transition duration-150 shadow-sm"
        >
          + Add Terminal
        </button>
      </div>

      <div className="content-body flex-1 w-full overflow-hidden">
        <DataTable
          columns={terminalColumns}
          data={terminals}
          userRole="admin"
          title="Authorized Terminals"
          fetching={fetchingTerminals}
          onEditRow={(row) => setEditingTerminal(row)}
          onDeleteRow={handleDeleteTerminal}
          height="h-full"
        />
      </div>

      {/* Add/Edit Terminal Modal */}
      {(showAddTerminal || editingTerminal) && (
        <TerminalModal 
          terminal={editingTerminal}
          existingTerminals={terminals}
          onClose={() => {
            setEditingTerminal(null);
            setShowAddTerminal(false);
          }}
          onSave={(data) => handleSaveTerminal(data, !!editingTerminal)}
        />
      )}
    </div>
  );
}

// Terminal Modal Component
interface TerminalModalProps {
  terminal?: any;
  existingTerminals: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}

function TerminalModal({ terminal, existingTerminals, onClose, onSave }: TerminalModalProps) {
  const [ip, setIp] = React.useState(terminal?.ip || "");
  const [name, setName] = React.useState(terminal?.name || "");
  const [pin, setPin] = React.useState(terminal?.pin || "");
  const [autoPrint, setAutoPrint] = React.useState(!!terminal?.auto_print);
  
  const pagesList = ["Dashboard", "Orders", "Scan Parcel", "Handover Parcel", "Setting"];
  const [allowedPages, setAllowedPages] = React.useState<string[]>(() => {
    if (terminal?.allowed_pages) {
      try {
        const parsed = JSON.parse(terminal.allowed_pages);
        if (Array.isArray(parsed)) {
          return parsed.map(p => p === "Scan Handover" ? "Handover Parcel" : p);
        }
        return parsed;
      } catch {}
    }
    return ["Dashboard", "Orders"];
  });

  const handlePageToggle = (page: string) => {
    setAllowedPages(prev => 
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim() || !name.trim() || !pin.trim()) {
      showToast("Please fill all required fields", "warning");
      return;
    }
    if (pin.length !== 4 || isNaN(Number(pin))) {
      showToast("PIN must be exactly a 4-digit number", "warning");
      return;
    }
    if (autoPrint) {
      const otherActive = existingTerminals.find(t => t.auto_print && t.ip !== terminal?.ip);
      if (otherActive) {
        const proceed = confirm(`Terminal "${otherActive.name}" already has Auto Print enabled. Enabling it here will disable Auto Print on that terminal. Do you want to proceed?`);
        if (!proceed) return;
      }
    }
    onSave({ ip, name, pin, allowed_pages: allowedPages, auto_print: autoPrint });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden font-primary animate-in fade-in zoom-in-95 duration-150">
        <header className="px-6 py-4 bg-[#f8f9fa] border-b border-zinc-200 flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#1f1f1f]">
            {terminal ? "Edit Terminal Configuration" : "Register New Terminal"}
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition">
            ✕
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">IP Address</label>
            <input 
              type="text" 
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={!!terminal}
              placeholder="e.g. 192.168.1.100"
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-500 focus:outline-none focus:border-[#0b57d0]"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">Terminal Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Packing Station 1"
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#0b57d0]"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">4-Digit PIN Gate</label>
            <input 
              type="text" 
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 1111"
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#0b57d0]"
              required
            />
          </div>

          <div className="flex items-center gap-2 py-1">
            <input 
              type="checkbox" 
              id="autoPrintCheck"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 text-[#0b57d0] border-zinc-300 rounded focus:ring-[#0b57d0]"
            />
            <label htmlFor="autoPrintCheck" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
              Enable Auto Print AWB (Kiosk Mode)
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">Allowed Screen Modules</label>
            <div className="grid grid-cols-2 gap-2 border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
              {pagesList.map(page => (
                <label key={page} className="flex items-center gap-2 text-xs text-zinc-700 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={allowedPages.includes(page)}
                    onChange={() => handlePageToggle(page)}
                    className="w-3.5 h-3.5 text-[#0b57d0] border-zinc-300 rounded focus:ring-[#0b57d0]"
                  />
                  {page}
                </label>
              ))}
            </div>
          </div>

          <footer className="mt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 text-zinc-700 text-xs font-bold rounded-lg hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-[#0b57d0] text-white text-xs font-bold rounded-lg hover:bg-[#0842a0] transition"
            >
              Save Terminal
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
