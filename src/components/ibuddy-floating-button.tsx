"use client";

import * as React from "react";
import { Bot } from "lucide-react";

interface IbuddyFloatingButtonProps {
  ibuddyGenerating: boolean;
  ibuddyUnreadCount: number;
  onJumpToIbuddy: () => void;
}

const BUTTON_SIZE = 44; // 44px (w-11 h-11)
const MARGIN = 24; // 24px from edges
const STORAGE_KEY = "ib_ibuddy_float_pos";

interface SavedPosition {
  edge: "left" | "right" | "top" | "bottom";
  x: number;
  y: number;
  ratioX?: number;
  ratioY?: number;
}

export function IbuddyFloatingButton({
  ibuddyGenerating,
  ibuddyUnreadCount,
  onJumpToIbuddy,
}: IbuddyFloatingButtonProps) {
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [isMounted, setIsMounted] = React.useState<boolean>(false);

  const pointerStartRef = React.useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });
  const hasMovedRef = React.useRef<boolean>(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  // Calculate magnetic snap coordinates to the closest edge or corner
  const calculateMagneticSnap = React.useCallback((currentX: number, currentY: number) => {
    if (typeof window === "undefined") return { x: currentX, y: currentY, edge: "right" as const };

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const minX = MARGIN;
    const maxX = Math.max(MARGIN, winW - BUTTON_SIZE - MARGIN);
    const minY = MARGIN;
    const maxY = Math.max(MARGIN, winH - BUTTON_SIZE - MARGIN);

    // Clamped coordinates inside window bounds
    const clampedX = Math.min(Math.max(currentX, minX), maxX);
    const clampedY = Math.min(Math.max(currentY, minY), maxY);

    // Distances to the 4 edges
    const dLeft = Math.abs(clampedX - minX);
    const dRight = Math.abs(maxX - clampedX);
    const dTop = Math.abs(clampedY - minY);
    const dBottom = Math.abs(maxY - clampedY);

    const minDistance = Math.min(dLeft, dRight, dTop, dBottom);

    let snappedX = clampedX;
    let snappedY = clampedY;
    let edge: "left" | "right" | "top" | "bottom" = "right";

    if (minDistance === dLeft) {
      snappedX = minX;
      edge = "left";
    } else if (minDistance === dRight) {
      snappedX = maxX;
      edge = "right";
    } else if (minDistance === dTop) {
      snappedY = minY;
      edge = "top";
    } else {
      snappedY = maxY;
      edge = "bottom";
    }

    return {
      x: snappedX,
      y: snappedY,
      edge,
      ratioX: maxX > minX ? (snappedX - minX) / (maxX - minX) : 1,
      ratioY: maxY > minY ? (snappedY - minY) / (maxY - minY) : 1,
    };
  }, []);

  // Initialize position from localStorage or default to bottom-right
  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined") return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const defaultX = winW - BUTTON_SIZE - MARGIN;
    const defaultY = winH - BUTTON_SIZE - MARGIN;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedPosition = JSON.parse(saved);
        const minX = MARGIN;
        const maxX = Math.max(MARGIN, winW - BUTTON_SIZE - MARGIN);
        const minY = MARGIN;
        const maxY = Math.max(MARGIN, winH - BUTTON_SIZE - MARGIN);

        let restoredX = defaultX;
        let restoredY = defaultY;

        if (parsed.edge === "left") {
          restoredX = minX;
          restoredY = parsed.ratioY !== undefined ? minY + parsed.ratioY * (maxY - minY) : parsed.y;
        } else if (parsed.edge === "right") {
          restoredX = maxX;
          restoredY = parsed.ratioY !== undefined ? minY + parsed.ratioY * (maxY - minY) : parsed.y;
        } else if (parsed.edge === "top") {
          restoredY = minY;
          restoredX = parsed.ratioX !== undefined ? minX + parsed.ratioX * (maxX - minX) : parsed.x;
        } else if (parsed.edge === "bottom") {
          restoredY = maxY;
          restoredX = parsed.ratioX !== undefined ? minX + parsed.ratioX * (maxX - minX) : parsed.x;
        } else {
          restoredX = parsed.x ?? defaultX;
          restoredY = parsed.y ?? defaultY;
        }

        const snapped = calculateMagneticSnap(restoredX, restoredY);
        setPosition({ x: snapped.x, y: snapped.y });
        return;
      }
    } catch {}

    setPosition({ x: defaultX, y: defaultY });
  }, [calculateMagneticSnap]);

  // Keep within bounds on window resize
  React.useEffect(() => {
    if (!isMounted) return;

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const snapped = calculateMagneticSnap(prev.x, prev.y);
        return { x: snapped.x, y: snapped.y };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMounted, calculateMagneticSnap]);

  // Pointer drag events
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    hasMovedRef.current = false;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position?.x ?? (window.innerWidth - BUTTON_SIZE - MARGIN),
      posY: position?.y ?? (window.innerHeight - BUTTON_SIZE - MARGIN),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    if (!hasMovedRef.current && Math.hypot(deltaX, deltaY) > 6) {
      hasMovedRef.current = true;
      setIsDragging(true);
    }

    if (hasMovedRef.current) {
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Allow dragging smoothly while keeping element within viewport boundaries
      const newX = Math.min(Math.max(pointerStartRef.current.posX + deltaX, 4), winW - BUTTON_SIZE - 4);
      const newY = Math.min(Math.max(pointerStartRef.current.posY + deltaY, 4), winH - BUTTON_SIZE - 4);

      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (hasMovedRef.current) {
      setIsDragging(false);
      // Magnetically snap to closest edge or corner
      const currentX = position?.x ?? (window.innerWidth - BUTTON_SIZE - MARGIN);
      const currentY = position?.y ?? (window.innerHeight - BUTTON_SIZE - MARGIN);
      const snapped = calculateMagneticSnap(currentX, currentY);

      setPosition({ x: snapped.x, y: snapped.y });

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            edge: snapped.edge,
            x: snapped.x,
            y: snapped.y,
            ratioX: snapped.ratioX,
            ratioY: snapped.ratioY,
          })
        );
      } catch {}
    } else {
      // Normal click without drag -> trigger jump to iBuddy
      onJumpToIbuddy();
    }
  };

  if (!isMounted || !position) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
        transition: isDragging
          ? "none"
          : "left 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), top 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), transform 0.15s ease",
      }}
      title={
        ibuddyGenerating
          ? "iBuddy is thinking..."
          : ibuddyUnreadCount > 0
          ? `iBuddy (${ibuddyUnreadCount} unread)`
          : "iBuddy"
      }
      className={`fixed z-50 group flex items-center justify-center p-0 rounded-2xl shadow-lg hover:shadow-xl select-none focus:outline-none ${
        isDragging
          ? "cursor-grabbing scale-105 shadow-2xl"
          : "cursor-grab active:scale-95 hover:scale-105"
      }`}
    >
      <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0842A0] via-[#0B57D0] to-[#1A73E8] text-white flex items-center justify-center shadow-md border border-blue-300/30 pointer-events-none">
        <Bot
          className={`w-5 h-5 text-white transition-transform duration-200 group-hover:scale-110 ${
            ibuddyGenerating ? "animate-pulse" : ""
          }`}
        />

        {/* Status Dot / Unread Badge */}
        {ibuddyGenerating ? (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-80" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#0B57D0] ring-2 ring-white items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </span>
        ) : ibuddyUnreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white items-center justify-center shadow-xs animate-in zoom-in-75">
            {ibuddyUnreadCount}
          </span>
        ) : (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
          </span>
        )}
      </div>
    </button>
  );
}
