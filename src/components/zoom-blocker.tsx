"use client";

import * as React from "react";

export function ZoomBlocker() {
  React.useEffect(() => {
    // 1. Prevent Ctrl + Mouse Wheel zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // 2. Prevent Ctrl + Keys (+, -, 0) zoom
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.ctrlKey &&
        (e.key === "=" ||
          e.key === "-" ||
          e.key === "0" ||
          e.key === "+" ||
          e.code === "NumpadAdd" ||
          e.code === "NumpadSubtract")
      ) {
        e.preventDefault();
      }
    };

    // 3. Prevent gesture/pinch zoom (Safari & iOS)
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    // Add event listeners with passive: false to allow e.preventDefault()
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("gesturestart", handleGestureStart);

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("gesturestart", handleGestureStart);
    };
  }, []);

  return null;
}
