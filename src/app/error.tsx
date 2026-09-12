"use client";

import * as React from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Route Error Boundary Caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col flex-1 h-full items-center justify-center p-6 bg-[#F8F9FA] font-primary">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h2 className="text-base font-bold text-zinc-950 mb-1">
          Unable to display this view
        </h2>
        <p className="text-xs text-zinc-500 mb-5">
          {error?.message || "An unexpected error occurred while loading this section."}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-lg transition-all shadow-xs"
          >
            Retry Section
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
