"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "danger" | "default" | "dark";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "Confirm",
  onConfirm,
  onCancel,
  variant = "dark",
}: ConfirmDialogProps) {
  
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="font-primary">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-950 font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            className="h-8 px-4 text-xs font-bold rounded-lg border border-zinc-300 bg-[#E5E5E5] text-zinc-700 hover:text-zinc-950 hover:bg-[#EEEEEE]/50 transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={`h-8 px-4 text-xs font-bold rounded-lg border transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none
              ${variant === "danger" 
                ? "border-red-700 bg-red-600 text-white hover:bg-red-700" 
                : variant === "dark" 
                ? "border-zinc-900 bg-zinc-800 text-[#EEEEEE] hover:bg-zinc-900" 
                : "border-zinc-300 bg-[#EEEEEE] text-zinc-700 hover:text-zinc-950 hover:bg-[#E5E5E5]/20"}`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
