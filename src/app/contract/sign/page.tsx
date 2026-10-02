"use client";
import * as React from "react";
import { submitMobileSignature } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function MobileSignPage() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  // Extract query parameters
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSessionId(params.get("sessionId"));
      setEmail(params.get("email"));
    }
  }, []);

  // Set up canvas sizing with higher DPI for smooth signature
  const initCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#0f172a"; // slate-900 for dark crisp ink
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  React.useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas, submitted]);

  // Drawing event handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const checkCanvasEmpty = (canvas: HTMLCanvasElement): boolean => {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return true;
      const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
      );
      return !pixelBuffer.some((color) => color !== 0);
    } catch {
      return !hasDrawn;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId) {
      showToast("Invalid signing session. Please scan a valid QR code.", "error");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      showToast("Please fill in your Name and Phone Number.", "warning");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || checkCanvasEmpty(canvas)) {
      showToast("Please draw your signature before submitting.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const signatureDataUrl = canvas.toDataURL("image/png");
      await submitMobileSignature(sessionId, name, phone, signatureDataUrl);
      setSubmitted(true);
    } catch (err: any) {
      showToast(err.message || "Failed to submit signature", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-6 text-center font-primary select-none animate-in fade-in duration-300">
        <div className="w-full max-w-sm flex flex-col gap-6 items-center">
          <img
            src="/logo.png"
            alt="HSG Global"
            className="h-16 sm:h-20 w-auto object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith("hsg-logo.png")) {
                target.src = "/hsg-logo.png";
              }
            }}
          />
          <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">Signature Submitted</h1>
            <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-xs">
              Your signature has been securely captured. Please check your desktop screen to download the signed agreement and complete your login.
            </p>
          </div>
          <div className="w-full border-t border-slate-100 my-1" />
          <p className="text-xs text-zinc-400 font-medium">You can now safely close this browser tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-between p-4 sm:p-6 font-primary select-none overflow-y-auto">
      <div className="w-full max-w-lg mx-auto flex flex-col justify-between flex-1 gap-5">
        
        {/* Header with Bigger Company Logo (No placeholder, no background box) */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <img
            src="/logo.png"
            alt="HSG Global"
            className="h-16 sm:h-20 w-auto object-contain transition-all"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith("hsg-logo.png")) {
                target.src = "/hsg-logo.png";
              }
            }}
          />
          <div className="flex flex-col gap-0.5 mt-1">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">Sign NDA Agreement</h1>
            <p className="text-xs text-zinc-500 font-medium truncate max-w-[340px]">
              {email ? `Signing for: ${email}` : "HSG Global Internal Bridge"}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between gap-4 mt-2">
          <div className="flex flex-col gap-3.5">
            {/* Full Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20 transition-all shadow-xs select-text"
              />
            </div>

            {/* Phone Number Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +65 8123 4567"
                className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20 transition-all shadow-xs select-text"
              />
            </div>

            {/* Signature Canvas with Full Width & High Usability */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700">Signature</label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer py-0.5 px-2 rounded-md hover:bg-zinc-100"
                >
                  Clear
                </button>
              </div>

              <div className="relative w-full h-64 sm:h-72 bg-white border border-slate-300 rounded-xl overflow-hidden cursor-crosshair touch-none transition-all shadow-2xs focus-within:border-[#0B57D0] focus-within:ring-2 focus-within:ring-[#0B57D0]/20">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="absolute inset-0 w-full h-full"
                />

                {/* Dotted signature guideline moved higher */}
                <div className="absolute bottom-12 left-6 right-6 border-b-2 border-dotted border-slate-300 pointer-events-none flex items-end">
                  <span className="text-xs text-zinc-400 font-serif pb-0.5 pr-2 select-none">✕</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 mt-2 bg-[#0B57D0] hover:bg-[#0842A0] active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-base font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/30 shrink-0"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Signature...</span>
              </>
            ) : (
              <span>Submit Signature</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

