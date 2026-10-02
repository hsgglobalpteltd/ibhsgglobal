"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { X, Eye, EyeOff } from "lucide-react";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

export function TiktokTerminalModule({ profile }: { profile?: any }) {
  // Terminal states
  const [terminals, setTerminals] = React.useState<any[]>([]);
  const [fetchingTerminals, setFetchingTerminals] = React.useState(true);
  const [editingTerminal, setEditingTerminal] = React.useState<any | null>(null);
  const [showAddTerminal, setShowAddTerminal] = React.useState(false);
  const [revealedPins, setRevealedPins] = React.useState<Record<string, boolean>>({});

  const togglePinVisibility = (ip: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [ip]: !prev[ip]
    }));
  };

  const terminalColumns: Column[] = [
    { id: "ip", header: "IP Address", accessor: "ip_display" },
    { id: "name", header: "Terminal Name", accessor: "name_display" },
    { id: "pin", header: "PIN Code (4-digit)", accessor: "pin_display" },
    { id: "allowed_pages_label", header: "Allowed Pages", accessor: "allowed_pages_display" },
    { id: "auto_print_label", header: "Auto Print AWB", accessor: "auto_print_display" },
  ];

  const loadTerminals = React.useCallback(async () => {
    setFetchingTerminals(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/tiktok/terminals`);
      if (!res.ok) throw new Error("Failed to fetch terminals");
      const data = (await res.json()) as any[];
      setTerminals(data.map(t => {
        let parsed: string[] = [];
        try {
          const raw = JSON.parse(t.allowed_pages || "[]");
          if (Array.isArray(raw)) {
            parsed = Array.from(new Set(raw.map((p: string) => (p === "Scan Handover" ? "Handover Parcel" : p))));
          }
        } catch {}

        return {
          ...t,
          id: t.ip, // Required by DataTable primary key check
          allowed_pages: JSON.stringify(parsed),
          allowed_pages_label: parsed.join(", "),
          auto_print_label: t.auto_print ? "Enabled" : "Disabled"
        };
      }));
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
            allowed_pages: JSON.stringify(Array.from(new Set(terminalData.allowed_pages || []))),
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

  const mappedTerminals = React.useMemo(() => {
    return terminals.map((t) => {
      let allowedList: string[] = [];
      try {
        const raw = JSON.parse(t.allowed_pages || "[]");
        if (Array.isArray(raw)) {
          allowedList = Array.from(new Set(raw.map((p: string) => (p === "Scan Handover" ? "Handover Parcel" : p))));
        }
      } catch {}

      const isPinRevealed = !!revealedPins[t.ip];

      return {
        ...t,
        ip_display: (
          <span className="font-mono text-zinc-900 text-xs font-medium select-text">
            {t.ip}
          </span>
        ),
        name_display: (
          <span className="text-xs text-zinc-900 font-medium select-text">
            {t.name}
          </span>
        ),
        pin_display: (
          <div className="inline-flex items-center gap-2">
            <span
              className={`font-mono font-medium select-text ${
                isPinRevealed ? "text-xs text-zinc-900 tracking-wider" : "text-sm text-zinc-400 tracking-widest"
              }`}
            >
              {isPinRevealed ? t.pin : "••••"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePinVisibility(t.ip);
              }}
              className="p-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer shadow-2xs"
              title={isPinRevealed ? "Hide PIN" : "Reveal PIN"}
            >
              {isPinRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        ),
        allowed_pages_display: (
          <span className="text-xs text-zinc-700 font-normal">
            {allowedList.length === 0 ? "-" : allowedList.join(", ")}
          </span>
        ),
        auto_print_display: (
          <span className={`text-xs ${t.auto_print ? "text-[#0B57D0] font-semibold" : "text-zinc-500 font-normal"}`}>
            {t.auto_print ? "Enabled" : "Disabled"}
          </span>
        )
      };
    });
  }, [terminals, revealedPins]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            Tiktok Terminals
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure authorized computer terminals, IP addresses, screen permissions, and Auto Print.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-hidden min-h-0">
        <DataTable
          columns={terminalColumns}
          data={mappedTerminals}
          userRole="admin"
          title="Tiktok Terminals Registry"
          fetching={fetchingTerminals}
          addNewText="Add Terminal"
          onAddNew={() => setShowAddTerminal(true)}
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
          return Array.from(new Set(parsed.map((p: string) => (p === "Scan Handover" ? "Handover Parcel" : p))));
        }
      } catch {}
    }
    return ["Dashboard", "Orders"];
  });

  const otherActive = existingTerminals.find(t => t.auto_print && t.ip !== terminal?.ip);

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
    onSave({ ip: ip.trim(), name: name.trim(), pin: pin.trim(), allowed_pages: allowedPages, auto_print: autoPrint });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none font-primary animate-tableFadeInOnly">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-tableFadeIn"
      >
        <header className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              {terminal ? "Edit Terminal Configuration" : "Register New Terminal"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure workstation identification, 4-digit PIN gate, and allowed system modules.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">IP Address</label>
              <input 
                type="text" 
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                disabled={!!terminal}
                placeholder="e.g. 192.168.1.100"
                className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all disabled:bg-slate-100 disabled:text-zinc-500 disabled:cursor-not-allowed font-mono"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-600">Terminal Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Packing Station 1"
                className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-600">4-Digit Security PIN Gate</label>
            <input 
              type="text" 
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 1111"
              className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all font-mono"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 p-3.5 border border-slate-200 rounded-lg bg-slate-50/60">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-zinc-800 cursor-pointer select-none">
              <input 
                type="checkbox" 
                id="autoPrintCheck"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-4 h-4 text-[#0B57D0] border-slate-300 rounded focus:ring-[#0B57D0] accent-[#0B57D0] cursor-pointer"
              />
              Enable Auto Print AWB (Kiosk Mode)
            </label>
            {autoPrint && otherActive && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 mt-1 font-medium">
                Note: Terminal <span className="font-bold">"{otherActive.name}"</span> currently has Auto Print enabled. Enabling it here will reassign Auto Print to this terminal upon saving.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-600">Allowed Screen Modules</label>
            <div className="grid grid-cols-2 gap-2.5 border border-slate-200 rounded-lg p-3.5 bg-slate-50/60">
              {pagesList.map(page => (
                <label key={page} className="flex items-center gap-2 text-xs text-zinc-700 select-none cursor-pointer font-medium hover:text-zinc-950">
                  <input 
                    type="checkbox" 
                    checked={allowedPages.includes(page)}
                    onChange={() => handlePageToggle(page)}
                    className="w-4 h-4 text-[#0B57D0] border-slate-300 rounded focus:ring-[#0B57D0] accent-[#0B57D0] cursor-pointer"
                  />
                  {page}
                </label>
              ))}
            </div>
          </div>
        </div>

        <footer className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="h-9 px-4 border border-slate-200 bg-white text-zinc-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="h-9 px-4 bg-[#0B57D0] text-white text-xs font-semibold rounded-lg hover:bg-[#0842A0] active:scale-98 transition cursor-pointer"
          >
            Save Terminal
          </button>
        </footer>
      </form>
    </div>
  );
}
