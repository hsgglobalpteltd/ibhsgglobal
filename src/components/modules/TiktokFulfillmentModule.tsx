"use client";

import * as React from "react";
import { 
  CheckCircle2, AlertCircle, Loader2, RefreshCw, ExternalLink, ShieldCheck
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";

interface TiktokFulfillmentModuleProps {
  profile?: {
    role: string;
    modules_access: string[];
    name?: string;
    email?: string;
  } | null;
}

interface ShopInfo {
  shop_id: string;
  shop_name: string;
  region: string;
  shop_cipher?: string;
}

export function TiktokFulfillmentModule({ profile }: TiktokFulfillmentModuleProps) {
  const [checking, setChecking] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<{
    checked: boolean;
    connected: boolean;
    shops: ShopInfo[];
    error?: string;
  }>({
    checked: false,
    connected: false,
    shops: []
  });

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/tiktok/auth/status");
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as any;
      if (data.connected) {
        setStatus({
          checked: true,
          connected: true,
          shops: data.shops || []
        });
        showToast("TikTok API Connection Successful!", "success");
      } else {
        setStatus({
          checked: true,
          connected: false,
          shops: [],
          error: data.error || "Verification failed."
        });
        showToast("TikTok API connection check failed.", "error");
      }
    } catch (err: any) {
      console.error(err);
      setStatus({
        checked: true,
        connected: false,
        shops: [],
        error: err.message || "Network request failed."
      });
      showToast("Network error checking connection.", "error");
    } finally {
      setChecking(false);
    }
  };

  // Run initial check on mount
  React.useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden p-2 select-none font-primary">
      {/* Content Header */}
      <div className="content-header flex flex-col gap-1 px-1 border-b border-zinc-300/40 pb-4">
        <h2 className="text-2xl font-bold text-zinc-950 flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-[#0B57D0]" />
          TikTok Shop Connector
        </h2>
        <p className="text-sm text-zinc-500">
          Verify and monitor open channel endpoints and verify your TikTok Shop seller authorizations.
        </p>
      </div>

      {/* Content Body */}
      <div className="content-body flex-1 w-full overflow-y-auto p-4 flex flex-col items-center justify-center bg-slate-50/50">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl p-8 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-2 border-b border-slate-100 pb-5">
            <h3 className="text-lg font-bold text-zinc-900">Connection Verification</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              Press the check button below to verify your current integration credentials and token viability.
            </p>
          </div>

          {/* Status Display Panel */}
          {status.checked && (
            <div className="w-full animate-tableFadeInOnly">
              {status.connected ? (
                <div className="flex flex-col gap-4">
                  {/* Connected Badge */}
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider">Channel Status</span>
                      <span className="text-sm font-semibold">Active & Connected</span>
                    </div>
                  </div>

                  {/* Connected Shops Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden mt-2">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      Authorized Seller Stores
                    </div>
                    {status.shops.length > 0 ? (
                      <div className="divide-y divide-slate-100 bg-white">
                        {status.shops.map((shop) => (
                          <div key={shop.shop_id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-zinc-900 uppercase">
                                {shop.shop_name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                Region: {shop.region}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ID: {shop.shop_id}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-[9px] text-emerald-700 font-bold uppercase">
                                Connected
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs italic text-zinc-400">
                        Authorized, but no active shops found.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Disconnected Badge */}
                  <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-800">
                    <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider">Channel Status</span>
                      <span className="text-sm font-semibold">Offline / Disconnected</span>
                    </div>
                  </div>

                  {/* Error Box */}
                  <div className="bg-zinc-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-1.5 mt-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Diagnostic Details</span>
                    <p className="text-xs text-zinc-600 font-mono whitespace-pre-wrap select-text break-words">
                      {status.error || "No response received. Verify that settings and credentials are correct."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col gap-3 items-center border-t border-slate-100 pt-5 mt-2">
            <CustomButton
              variant="dark"
              onClick={checkConnection}
              disabled={checking}
              className="w-full h-11 text-xs gap-2 font-bold bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] max-w-sm"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Channel Connection...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Check API Connection
                </>
              )}
            </CustomButton>

            <a
              href="https://partner.tiktokshop.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B57D0] hover:text-[#0842A0] hover:underline transition-colors mt-1"
            >
              Manage Partner Center App
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
