"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Monitor, Smartphone, Rocket, ChevronRight, ExternalLink } from "lucide-react";

/**
 * DeviceGuard
 * Enforces Tablet & Desktop access for the iB Admin Console (screen width >= 768px).
 * When opened on mobile phones (< 768px), provides direct access buttons to:
 * 1. Worker Applications Portal (app.hsgglobal.sg)
 * 2. Manager Applications Portal (ibm.hsgglobal.sg)
 * With an advisory note that full iB Console features require PC/Desktop access.
 */
export function DeviceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [mounted, setMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      // Tablet & Desktop breakpoint: min-width 768px
      // Mobile phone viewport: strictly < 768px
      const width = window.innerWidth;
      setIsMobile(width < 768);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Exemption: Contract signing and Taste Review routes require mobile phone touch / camera access
  if (pathname && (pathname.startsWith("/contract/sign") || pathname.startsWith("/review"))) {
    return <>{children}</>;
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-9999 bg-[#F0F4F9] flex flex-col justify-between items-center p-6 text-center select-none font-primary overflow-y-auto animate-in fade-in duration-200">
        <div className="w-full max-w-sm my-auto flex flex-col items-center gap-5 py-4">
          {/* Company Logo & Header */}
          <div className="flex flex-col items-center">
            <img
              src="/logo.png"
              alt="HSG Global"
              className="w-20 h-20 object-contain drop-shadow-sm mb-2"
              onError={(e) => {
                // Fallback to hsg-logo.png if logo.png not loaded
                const target = e.currentTarget;
                if (!target.src.endsWith("hsg-logo.png")) {
                  target.src = "/hsg-logo.png";
                }
              }}
            />
            <h1 className="text-xl font-bold text-zinc-950 tracking-tight">
              iB - HSG Global
            </h1>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Mobile Applications Portal
            </p>
          </div>

          {/* 2 Primary Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            {/* Button 1: App for Worker */}
            <a
              href="https://app.hsgglobal.sg"
              className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 hover:border-[#0B57D0]/40 rounded-xl p-4 flex items-center justify-between shadow-xs transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B57D0] shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 group-hover:text-[#0B57D0] transition-colors">
                    App for Worker
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                    Field operations, stock flow, picker, driver &amp; claims
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-[#0B57D0] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </a>

            {/* Button 2: App for Manager */}
            <a
              href="https://ibm.hsgglobal.sg"
              className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 hover:border-[#0B57D0]/40 rounded-xl p-4 flex items-center justify-between shadow-xs transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                    App for Manager
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                    Management tools, approvals &amp; supervisory operations
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </a>
          </div>

          {/* Note / Desktop Advisory */}
          <div className="w-full bg-white/90 border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
            <p className="text-[11px] text-zinc-500 leading-relaxed text-center">
              For full features of iB, please access via PC / Desktop.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center pt-2 pb-2">
          <p className="text-[11px] font-semibold text-zinc-600 tracking-wide">
            iB - HSG Global Internal Bridge
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Copyright &copy; 2026 HSG Global. All rights reserved.
          </p>
        </footer>
      </div>
    );
  }

  return <>{children}</>;
}
