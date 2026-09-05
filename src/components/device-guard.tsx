"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Monitor, Tablet, Smartphone } from "lucide-react";

/**
 * DeviceGuard
 * Enforces Tablet & Desktop access only (screen width >= 768px).
 * Mobile phones (< 768px) are blocked with a clear branded advisory screen.
 * The contract signature page (/contract/sign) is exempted to allow mobile QR signing.
 */
export function DeviceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [currentWidth, setCurrentWidth] = React.useState<number>(1024);
  const [mounted, setMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      // Tablet breakpoint: min-width 768px (iPad Mini is 768px, iPad is 810px+)
      // Mobile is strictly < 768px
      const width = window.innerWidth;
      setCurrentWidth(width);
      setIsMobile(width < 768);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Exemption: Contract signing route requires mobile phone touch signature
  if (pathname && pathname.startsWith("/contract/sign")) {
    return <>{children}</>;
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-9999 bg-[#F0F4F9] flex flex-col items-center justify-center p-6 text-center select-none font-primary animate-in fade-in duration-200">
        <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl rounded-2xl p-7 flex flex-col items-center gap-5">
          {/* Device Icons Banner */}
          <div className="flex items-center justify-center gap-3 text-zinc-400">
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-zinc-400">
              <Smartphone className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-zinc-300 font-bold">→</span>
            <div className="w-12 h-12 rounded-xl bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0] shadow-xs">
              <Tablet className="w-6 h-6" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0] shadow-xs">
              <Monitor className="w-6 h-6" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200 text-[10px] font-bold uppercase tracking-wider self-center">
              Desktop &amp; Tablet Only
            </span>
            <h2 className="text-lg font-bold text-zinc-950 mt-1">
              Screen Size Not Supported
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              This portal is optimized exclusively for <strong>Tablet</strong> and <strong>Desktop</strong> devices. Please open on a tablet (iPad / Android Tablet) or desktop computer.
            </p>
          </div>

          <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-zinc-600 flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between font-semibold">
              <span>Minimum Required Width:</span>
              <span className="font-mono text-zinc-900 font-bold">768px (Tablet)</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Current Screen Width:</span>
              <span className="font-mono text-red-600 font-bold">{currentWidth}px</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 font-medium">
            HSG Global Internal Bridge • Device Guard
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
