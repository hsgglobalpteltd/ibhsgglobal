"use client";
import * as React from "react";
import { submitMobileSignature } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { Shield, CheckCircle, RefreshCw } from "lucide-react";

export default function MobileSignPage() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

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

  // Set up canvas sizing
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // double resolution for high DPI displays
    canvas.height = rect.height * 2;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      ctx.strokeStyle = "#18181b"; // zinc-900 color
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [submitted]);

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
  };

  const checkCanvasEmpty = (canvas: HTMLCanvasElement): boolean => {
    const buffer = new Uint32Array(
      canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !buffer.some((color) => color !== 0);
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
      showToast("Please sign on the signature pad before submitting.", "warning");
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
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#E5E5E5] p-8 text-center font-primary select-none overflow-hidden animate-fade-in gap-5">
        <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-zinc-900">Signature Submitted!</h1>
        <p className="text-sm text-zinc-650 leading-relaxed max-w-xs">
          Your handwritten signature has been successfully captured. Please check your desktop computer to download the signed contract PDF and finalize your login setup.
        </p>
        <p className="text-xs text-zinc-400 font-medium mt-4">You can safely close this mobile browser tab now.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col justify-between bg-[#E5E5E5] p-5 font-primary select-none overflow-hidden">
      <div className="flex flex-col gap-1 text-center mt-1">
        <div className="mx-auto h-9 w-9 rounded-lg bg-zinc-700 text-white flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 mt-1">Sign NDA Contract</h1>
        <p className="text-[10px] text-zinc-500 font-medium truncate">
          {email ? `Signing for: ${email}` : "Capture mobile credentials"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between mt-4 gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="h-10 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 select-text"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +65 8123 4567"
              className="h-10 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 select-text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Draw Signature</label>
              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-800 font-bold cursor-pointer"
              >
                <RefreshCw size={10} />
                <span>Clear Canvas</span>
              </button>
            </div>
            <div className="relative w-full h-36 bg-zinc-50 border border-zinc-300 rounded-lg overflow-hidden cursor-crosshair touch-none">
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
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-zinc-800 hover:bg-zinc-900 disabled:bg-zinc-400 text-white rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer focus:outline-none mb-1"
        >
          {submitting ? "Submitting Signature..." : "Submit Signature"}
        </button>
      </form>
    </div>
  );
}
