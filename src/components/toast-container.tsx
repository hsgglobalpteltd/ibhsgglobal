"use client";

import * as React from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { ToastType } from "@/lib/toast";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  isExiting: boolean;
}

export function ToastContainer() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
      if (!customEvent.detail) return;

      const newId = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = {
        id: newId,
        message: customEvent.detail.message,
        type: customEvent.detail.type,
        isExiting: false,
      };

      setToasts((prev) => [...prev, newToast]);

      // FIFO timer: 3 seconds before initiating exit animation
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === newId ? { ...t, isExiting: true } : t))
        );

        // Allow 500ms for exit transition to complete before removing from state
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newId));
        }, 500);
      }, 3000);
    };

    window.addEventListener("add-toast", handleAddToast);
    return () => {
      window.removeEventListener("add-toast", handleAddToast);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 500);
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        let bgClass = "";
        let borderClass = "";
        let textClass = "";
        let iconColorClass = "";
        let Icon = Info;

        switch (toast.type) {
          case "success":
            bgClass = "bg-[#EBF7ED]";
            borderClass = "border-[#C8E6C9]";
            textClass = "text-[#1B5E20]";
            iconColorClass = "text-[#2E7D32]";
            Icon = CheckCircle2;
            break;
          case "warning":
            bgClass = "bg-[#FFF3E0]";
            borderClass = "border-[#FFE0B2]";
            textClass = "text-[#E65100]";
            iconColorClass = "text-[#F57C00]";
            Icon = AlertTriangle;
            break;
          case "error":
            bgClass = "bg-[#FFEBEE]";
            borderClass = "border-[#FFCDD2]";
            textClass = "text-[#C62828]";
            iconColorClass = "text-[#D32F2F]";
            Icon = XCircle;
            break;
          case "info":
          default:
            bgClass = "bg-[#F5F5F5]";
            borderClass = "border-[#E0E0E0]";
            textClass = "text-[#424242]";
            iconColorClass = "text-[#616161]";
            Icon = Info;
            break;
        }

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-md font-toast text-sm transition-all duration-500 ease-in-out
              ${bgClass} ${borderClass} ${textClass}
              ${
                toast.isExiting
                  ? "opacity-0 max-h-0 py-0 my-0 border-y-0 overflow-hidden"
                  : "opacity-100 max-h-24"
              }
            `}
            style={{
              transitionProperty: "opacity, max-height, padding, margin, border-width",
            }}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColorClass}`} />
            <div className="flex-1 font-semibold leading-snug">{toast.message}</div>
            <button
              onClick={() => handleDismiss(toast.id)}
              className="text-zinc-400 hover:text-zinc-600 transition-colors pointer-events-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
