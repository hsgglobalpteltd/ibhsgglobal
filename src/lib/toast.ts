"use client";

export type ToastType = "success" | "info" | "warning" | "error";

export function showToast(message: string, type: ToastType) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("add-toast", {
        detail: { message, type },
      })
    );
  }
}
