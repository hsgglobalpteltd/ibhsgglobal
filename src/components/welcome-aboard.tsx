"use client";

import * as React from "react";
import { LogOut, FileText, QrCode, Hourglass, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { fetchLatestContract, startSigningSession, pollSigningSession, finalizeContractSignature, UserProfile } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { jsPDF } from "jspdf";

interface WelcomeAboardScreenProps {
  profile: UserProfile;
  idToken: string;
  onLogout: () => void;
  onComplete: (updatedProfile: UserProfile) => void;
  userEmail?: string | null;
}

// Helper to load image as base64 data URL for jsPDF
const loadImgDataUrl = (src: string): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve("");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 64;
        canvas.height = img.naturalHeight || 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve("");
        }
      } catch {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
};

export function WelcomeAboardScreen({ profile, idToken, onLogout, onComplete, userEmail }: WelcomeAboardScreenProps) {
  const emailToUse = userEmail || profile.email || (profile as any).Email || "";
  const [contractText, setContractText] = React.useState("");
  const [isContractLoading, setIsContractLoading] = React.useState(true);
  const [scrolledToBottom, setScrolledToBottom] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);

  // QR Modal and Polling States
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [timeLeft, setTimeLeft] = React.useState(180); // 3 minutes in seconds
  
  const pollIntervalRef = React.useRef<any>(null);
  const timerIntervalRef = React.useRef<any>(null);

  // Load contract text directly from API
  React.useEffect(() => {
    fetchLatestContract()
      .then((latest) => {
        if (latest && latest.text && latest.text.trim().length > 0) {
          setContractText(latest.text);
        }
      })
      .catch((err) => {
        console.warn("Could not load latest contract from API:", err);
      })
      .finally(() => {
        setIsContractLoading(false);
      });
  }, []);

  // Monitor scroll height
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= 25;
    if (isAtBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleCancelSession = React.useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    pollIntervalRef.current = null;
    timerIntervalRef.current = null;
    setShowQrModal(false);
    setSessionId(null);
    setLoading(false);
  }, []);

  const handleFinalizeSignature = async (sessionData: any) => {
    setFinalizing(true);
    try {
      // 1. Generate signed contract PDF
      const doc = new jsPDF();
      
      // Load company favicon icon for PDF header
      const iconDataUrl = await loadImgDataUrl("/icon.png").catch(() => "");
      if (iconDataUrl) {
        try {
          doc.addImage(iconDataUrl, "PNG", 20, 14, 12, 12);
        } catch {}
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("iB - HSG Global Internal Bridge", 35, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Terms of Service and Non-Disclosure Agreement", 35, 26);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("iB - HSG Global Internal Bridge", 20, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Terms of Service and Non-Disclosure Agreement", 20, 26);
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 31, 190, 31);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const splitText = doc.splitTextToSize(contractText, 170);
      doc.text(splitText, 20, 40);

      const finalY = 40 + (splitText.length * 4.8);
      doc.line(20, finalY, 190, finalY);
      doc.setFont("helvetica", "bold");
      doc.text(`Signed by: ${sessionData.name}`, 20, finalY + 10);
      doc.text(`Contact: ${sessionData.phone}`, 20, finalY + 16);
      const signedNow = new Date();
      const signedDateStr = signedNow.toLocaleDateString("en-GB") + " " + signedNow.toLocaleTimeString([], { hour12: false });
      doc.text(`Date signed: ${signedDateStr}`, 20, finalY + 22);

      // Embed signature image from mobile
      if (sessionData.signature_data) {
        doc.addImage(sessionData.signature_data, "PNG", 20, finalY + 28, 50, 20);
      }

      // Trigger Auto-Download to users desktop
      doc.save("iB - HSG Global NDA contract.pdf");
      showToast("Signed contract PDF downloaded successfully!", "success");

      // 2. Upload signed PDF directly to R2
      const pdfBlob = doc.output("blob");
      const uploadFileName = `contract/Signed_Contract/contract_${emailToUse}_${Date.now()}.pdf`;
      const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(uploadFileName)}`, {
        method: "POST",
        body: pdfBlob,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload signed contract to storage");
      }

      const uploadJson = await uploadRes.json() as { success: boolean; url: string };
      const pdfUrl = uploadJson.url;

      // 3. Finalize and update profile in D1
      const updatedProfile = await finalizeContractSignature(
        idToken,
        emailToUse,
        sessionData.name,
        sessionData.phone,
        sessionData.signature_data,
        pdfUrl,
        Date.now()
      );

      showToast("Contract signature finalized!", "success");
      onComplete(updatedProfile);
    } catch (err: any) {
      showToast(err.message || "Failed to finalize signing", "error");
    } finally {
      setFinalizing(false);
      handleCancelSession();
    }
  };

  const handleSignClick = async () => {
    setLoading(true);
    try {
      const res = await startSigningSession(emailToUse);
      setSessionId(res.session_id);
      setTimeLeft(180); // 3 mins countdown
      setShowQrModal(true);

      // Start Countdown
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      // Start Polling
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await pollSigningSession(res.session_id);
          if (statusRes.status === "submitted") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            pollIntervalRef.current = null;
            timerIntervalRef.current = null;
            handleFinalizeSignature(statusRes);
          }
        } catch (e) {
          console.warn("Poll failed, retrying...", e);
        }
      }, 2000);

    } catch (err: any) {
      showToast(err.message || "Failed to initialize signing session", "error");
      setLoading(false);
    }
  };

  // Monitor countdown timer expiration
  React.useEffect(() => {
    if (timeLeft === 0 && showQrModal) {
      handleCancelSession();
      showToast("Signing session expired. Please retry.", "error");
    }
  }, [timeLeft, showQrModal, handleCancelSession]);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQrCodeUrl = () => {
    if (typeof window === "undefined" || !sessionId) return "";
    const origin = window.location.origin;
    const signUrl = `${origin}/contract/sign?sessionId=${encodeURIComponent(sessionId)}&email=${encodeURIComponent(emailToUse)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(signUrl)}`;
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F0F4F9] p-4 sm:p-6 font-primary animate-fade-in select-none">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col h-[88vh] max-h-[850px] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <img
              src="/icon.png"
              alt="HSG Global"
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith("icon-192.png")) {
                  target.src = "/icon-192.png";
                }
              }}
            />
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col justify-center">
              <h1 className="text-base font-bold tracking-tight text-zinc-950">NDA Agreement & Terms of Service</h1>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Review the terms below and scroll to the bottom to sign</p>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
            title="Sign out of your session"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>

        {/* Document Reading Viewport */}
        <div 
          onScroll={handleScroll}
          className="w-full p-6 sm:p-8 overflow-y-auto bg-[#F8F9FA] flex-1 select-text"
        >
          <div className="max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-xl p-8 sm:p-10 shadow-xs flex flex-col gap-6 text-zinc-700">
            
            {/* Document Header Inside Page */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-[#0B57D0] uppercase tracking-wider">HSG GLOBAL PTE. LTD.</span>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-950">Terms of Service & Non-Disclosure Agreement</h2>
                <p className="text-xs text-zinc-500 font-medium">HSG Global Internal Bridge System Access Policy</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0B57D0] text-[11px] font-bold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confidential</span>
              </div>
            </div>

            {/* Document Body Text */}
            {/* Document Body Text */}
            {isContractLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
                <Loader2 className="w-8 h-8 text-[#0B57D0] animate-spin" />
                <span className="text-xs font-medium text-zinc-500">Loading agreement terms...</span>
              </div>
            ) : (
              <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal text-zinc-700 space-y-4">
                {contractText}
              </div>
            )}

            {/* Signature Notice Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>iB HSG Global Internal Bridge</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 bg-[#F8F9FA] border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            {isContractLoading ? (
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />
                <span>Fetching latest agreement...</span>
              </span>
            ) : scrolledToBottom ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Agreement reviewed. You may now sign.</span>
              </span>
            ) : (
              <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span>Scroll to the bottom of the agreement to enable signing.</span>
              </span>
            )}
          </div>
          
          <button 
            type="button" 
            disabled={isContractLoading || !contractText || !scrolledToBottom || loading}
            onClick={handleSignClick}
            className="h-10 px-5 bg-[#0B57D0] hover:bg-[#0842A0] active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating QR...</span>
              </>
            ) : (
              <>
                <QrCode className="w-3.5 h-3.5" />
                <span>Sign Contract</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QR Code Handshake Dialog Overlay */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-primary animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#0B57D0]" />
                <h3 className="text-sm font-bold text-zinc-950">Scan QR to Sign</h3>
              </div>
              <button 
                type="button"
                onClick={handleCancelSession}
                className="text-zinc-400 hover:text-zinc-800 rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4 text-center">
              {finalizing ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-10 h-10 text-[#0B57D0] animate-spin" />
                  <span className="text-sm font-bold text-zinc-900">Compiling signed agreement...</span>
                  <p className="text-xs text-zinc-500 max-w-[260px]">Please wait while we secure your signature and finalize registration.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Scan the QR code below using your mobile phone camera to fill out your details and sign securely.
                  </p>

                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md flex items-center justify-center w-60 h-60">
                    <img 
                      src={getQrCodeUrl()} 
                      alt="Signature QR Code" 
                      className="w-full h-full rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-2 bg-[#F0F4F9] px-4 py-2 rounded-full border border-slate-200 w-fit">
                    <Hourglass className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span className="text-xs font-semibold text-zinc-700">Expires in: {formatTime(timeLeft)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelSession}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer mt-1"
                  >
                    Cancel and return
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

