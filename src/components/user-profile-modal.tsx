"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Shield, Lock, Eye, EyeOff, User, Phone, Mail, KeyRound, Laptop, Smartphone, Tablet, Globe, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { showToast } from "@/lib/toast";
import { updateMyProfile, fetchActiveUserSessions, revokeUserSession, UserProfile, ActiveUserSession } from "@/lib/api";

interface UserProfileModalProps {
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  profile: UserProfile | null;
  idToken?: string;
  onClose: () => void;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
}

function formatSessionDate(timestamp: number | string | undefined): string {
  if (!timestamp) return "Unknown";
  const num = Number(timestamp);
  if (isNaN(num) || num <= 0) return "Unknown";
  const d = new Date(num);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export function UserProfileModal({
  user,
  profile,
  idToken = "simulated-id-token",
  onClose,
  onProfileUpdated,
}: UserProfileModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [name, setName] = React.useState<string>(profile?.name || user?.displayName || "");
  const [phone, setPhone] = React.useState<string>(profile?.phone_number || "");
  const [managerPin, setManagerPin] = React.useState<string>(profile?.manager_pin || "");
  const [showPin, setShowPin] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);

  // Active Sessions state
  const [sessions, setSessions] = React.useState<ActiveUserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = React.useState<boolean>(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state if profile prop changes
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || user?.displayName || "");
      setPhone(profile.phone_number || "");
      setManagerPin(profile.manager_pin || "");
    }
  }, [profile, user]);

  const loadSessions = React.useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetchActiveUserSessions(idToken);
      if (res && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      }
    } catch (err: any) {
      console.warn("Failed to load active sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, [idToken]);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await revokeUserSession(idToken, { sessionId });
      showToast("Device logged out successfully.", "success");
      await loadSessions();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke device session.", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setRevokingId("all_others");
    try {
      await revokeUserSession(idToken, { revokeAllOthers: true });
      showToast("Logged out of all other devices successfully.", "success");
      await loadSessions();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke other sessions.", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ""); // Allow only digits
    if (rawVal.length <= 6) {
      setManagerPin(rawVal);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("Full name cannot be blank.", "error");
      return;
    }

    if (managerPin && managerPin.length !== 6) {
      showToast("Manager PIN must be exactly 6 numerical digits (0-9).", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile(idToken, {
        name: name.trim(),
        phone_number: phone.trim() || null,
        manager_pin: managerPin.trim() || null,
      });

      showToast("Your profile has been updated successfully!", "success");
      onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = profile?.role === "Administrator";
  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone size={16} className="text-zinc-600" />;
      case "tablet":
        return <Tablet size={16} className="text-zinc-600" />;
      default:
        return <Laptop size={16} className="text-zinc-600" />;
    }
  };

  const modalNode = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none font-primary animate-tableFadeInOnly">
      {/* Modal Container */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh] animate-tableFadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h3 className="text-base font-bold text-zinc-950">Account Profile & Device Settings</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage your profile, private PIN, and view devices logged into your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* User Role Card */}
          <div className="flex items-center justify-between p-3.5 bg-[#F0F4F9] border border-slate-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D3E3FD] text-[#0B57D0] flex items-center justify-center font-bold text-sm">
                {(name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-900">{user?.email || "admin@hsg-global.com"}</span>
                <span className="text-[11px] text-zinc-500">Security Identity</span>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              <Shield size={12} />
              {profile?.role || "Administrator"}
            </span>
          </div>

          {/* Form Fields Section */}
          <div className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <User size={13} className="text-zinc-400" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Phone size={13} className="text-zinc-400" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +65 9123 4567"
                className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
              />
            </div>

            {/* Email (Read Only) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Mail size={13} className="text-zinc-400" />
                Email Address (Read Only)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || user?.email || ""}
                className="h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-zinc-500 cursor-not-allowed font-medium"
              />
            </div>

            {/* 6-Digit Manager PIN Section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#D3E3FD] text-[#0B57D0] flex items-center justify-center">
                    <KeyRound size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Manager 6-Digit PIN</span>
                    <span className="text-[10.5px] text-zinc-500">Access PIN for Manager App</span>
                  </div>
                </div>
                {managerPin.length === 6 && (
                  <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    PIN Configured
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="relative flex items-center">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={managerPin}
                    onChange={handlePinChange}
                    placeholder="Enter 6-digit PIN (e.g. 123456)"
                    className="h-10 w-full pl-3 pr-10 bg-white border border-slate-200 rounded-lg text-sm tracking-widest text-zinc-900 placeholder:tracking-normal placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-mono font-bold transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 px-0.5">
                  <span>Must be exactly 6 numeric digits</span>
                  <span className={managerPin.length === 6 ? "text-emerald-600 font-bold" : "text-zinc-400"}>
                    {managerPin.length}/6 digits
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 bg-white p-2.5 rounded border border-slate-200/80 leading-relaxed flex items-start gap-1.5">
                <Lock size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Privacy:</strong> This PIN is private to your administrator account. Other administrators cannot see, view, or modify your PIN.
                </span>
              </div>
            </div>

            {/* Active Devices & Connected Sessions Section */}
            <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#D3E3FD] text-[#0B57D0] flex items-center justify-center">
                    <Laptop size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">Connected Devices</span>
                      <span className="text-[10px] font-bold bg-[#D3E3FD] text-[#0B57D0] px-2 py-0.5 rounded-full">
                        {sessions.length} {sessions.length === 1 ? "Device" : "Devices"} Logged In
                      </span>
                    </div>
                    <span className="text-[10.5px] text-zinc-500 block">
                      Active device sessions logged into your account
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadSessions}
                  disabled={loadingSessions}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  title="Refresh active devices"
                >
                  <RefreshCw size={14} className={loadingSessions ? "animate-spin text-[#0B57D0]" : ""} />
                </button>
              </div>

              {/* Devices List */}
              <div className="flex flex-col gap-2 mt-1">
                {sessions.length === 0 && !loadingSessions ? (
                  <div className="text-xs text-zinc-400 p-3 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    No active device sessions found.
                  </div>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-all ${
                        sess.is_current
                          ? "bg-blue-50/40 border-blue-200 shadow-2xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                            sess.is_current ? "bg-[#D3E3FD] text-[#0B57D0]" : "bg-slate-200 text-zinc-600"
                          }`}
                        >
                          {getDeviceIcon(sess.device_type)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {sess.app || "iB - System Session"}
                            </span>
                            {sess.is_current && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                Current Device
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 truncate mt-0.5">
                            <span className="font-medium text-zinc-700">{sess.platform || "Web"}</span>
                            <span>•</span>
                            <span className="font-mono text-[10.5px] text-zinc-500">{sess.ip || "Unknown IP"}</span>
                            <span>•</span>
                            <span className="text-zinc-400">
                              {sess.is_current ? "Active Now" : `Active: ${formatSessionDate(sess.last_active)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      {!sess.is_current && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.id)}
                          disabled={revokingId === sess.id}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <LogOut size={12} />
                          {revokingId === sess.id ? "Revoking..." : "Log Out"}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Log Out All Other Devices */}
              {otherSessionsCount > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    {otherSessionsCount} other {otherSessionsCount === 1 ? "device" : "devices"} logged in
                  </span>
                  <button
                    type="button"
                    onClick={handleRevokeAllOthers}
                    disabled={revokingId === "all_others"}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <LogOut size={12} />
                    {revokingId === "all_others" ? "Logging out all..." : "Log out all other devices"}
                  </button>
                </div>
              )}
            </div>
          </div>
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

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalNode, document.body);
}
