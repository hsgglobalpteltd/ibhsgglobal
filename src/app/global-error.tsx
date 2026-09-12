"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#F8F9FA] text-zinc-900 font-sans antialiased min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-base font-bold text-zinc-950 mb-1">
            Something went wrong
          </h2>
          <p className="text-xs text-zinc-500 mb-5">
            An unexpected error occurred. Please try reloading or returning to the dashboard.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-lg transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/";
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all"
            >
              Go to Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
