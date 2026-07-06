"use client";

import * as React from "react";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";

export function PromoterModule() {
  return (
    <div className="flex flex-col gap-6 font-primary">
      {/* Module Workspace Card */}
      <div className="bg-[#E5E5E5] border border-zinc-300 rounded-lg p-6 flex items-center justify-center h-48 shadow-sm">
        <span className="text-zinc-500 text-sm font-semibold italic">
          Promoter Module Workspace
        </span>
      </div>

      {/* Toast Control Center */}
      <div className="flex flex-col gap-3 p-6 bg-[#E5E5E5] border border-zinc-300 rounded-lg shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Toast Alerts Simulator</h3>
          <p className="text-xs text-zinc-500">
            Click any button below to trigger a custom FIFO notification toast in the top-right corner.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-1">
          <CustomButton
            onClick={() => showToast("Operation completed successfully!", "success")}
            className="bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
          >
            Success Toast (Green)
          </CustomButton>

          <CustomButton
            onClick={() => showToast("This is a general system notification.", "info")}
            className="bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-800"
          >
            Anything Toast (Gray)
          </CustomButton>

          <CustomButton
            onClick={() => showToast("Warning: Resource limit approaching.", "warning")}
            className="bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          >
            Warning Toast (Orange)
          </CustomButton>

          <CustomButton
            onClick={() => showToast("Error: Connection to database failed.", "error")}
            className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
          >
            Error Toast (Red)
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
