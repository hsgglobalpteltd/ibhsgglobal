"use client";

import * as React from "react";
import { Shield, LogOut, Check, FileText, QrCode, Hourglass, Loader2 } from "lucide-react";
import { CustomButton } from "./custom-button";
import { fetchLatestContract, startSigningSession, pollSigningSession, finalizeContractSignature, UserProfile } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { jsPDF } from "jspdf";

interface WelcomeAboardScreenProps {
  profile: UserProfile;
  idToken: string;
  onLogout: () => void;
  onComplete: (updatedProfile: UserProfile) => void;
}

const FALLBACK_CONTRACT_TEXT = `iB - HSG GLOBAL Internal Bridge
Terms of Service and Non-Disclosure Agreement

By completing this registration form and requesting access to the HSG Global Internal Bridge ("iB"), you explicitly acknowledge, understand, and agree to the following terms and conditions:

1. Authorized Access and Employment Status
You acknowledge that this portal is strictly for the internal use of employees and authorized personnel of HSG GLOBAL PTE. LTD. Access to this portal is a privilege tied directly to your current employment or contract status. In the event that your relationship with HSG GLOBAL PTE. LTD. is terminated or concluded, your access privileges will be revoked immediately, and your account will be removed without prior notice.

2. Data Confidentiality and Non-Disclosure
All information, data, metrics, and content hosted within the iB are strictly Confidential and Proprietary. You are expressly prohibited from sharing, exporting, duplicating, or disclosing any data from this portal to any third party without the explicit written consent of the Director or an authorized representative acting on behalf of the company.

3. Accountability and Data Integrity
You bear full responsibility and accountability for all activities, modifications, and data entries performed under your registered account. You agree to maintain the highest standards of data integrity and ensure that all information input into the system is accurate and truthful.

4. Prohibition of Sabotage and Misconduct
Any deliberate attempt to sabotage, corrupt, or manipulate data—including but not limited to providing intentionally false inputs, deleting critical records, or compromising system security—is strictly prohibited. Any such misconduct will result in immediate termination of portal access, disciplinary action, and potential legal and financial liability for damages caused.

5. No Financial Transactions
The iB is exclusively an operational tool. It does not require, request, or accept any form of payment, subscription fees, or financial transactions. Be vigilant against any unauthorized requests for financial information within this platform.`;

export function WelcomeAboardScreen({ profile, idToken, onLogout, onComplete }: WelcomeAboardScreenProps) {
  const [contractText, setContractText] = React.useState(FALLBACK_CONTRACT_TEXT);
  const [scrolledToBottom, setScrolledToBottom] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);

  // QR Modal and Polling States
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [timeLeft, setTimeLeft] = React.useState(180); // 3 minutes in seconds
  
  const pollIntervalRef = React.useRef<any>(null);
  const timerIntervalRef = React.useRef<any>(null);

  // Load contract text
  React.useEffect(() => {
    fetchLatestContract()
      .then((latest) => {
        if (latest && latest.text && latest.text.trim().length > 0) {
          setContractText(latest.text);
        } else {
          // Fallback to static text file
          fetch("/sign-up contract.txt")
            .then((res) => {
              if (res.ok) return res.text();
              throw new Error("Failed to load static file");
            })
            .then((text) => {
              if (text && text.trim().length > 0) {
                setContractText(text);
              }
            })
            .catch((e) => console.warn("Static contract fallback failed:", e));
        }
      })
      .catch((err) => {
        console.warn("Could not load latest contract from API, using static fallback:", err);
        fetch("/sign-up contract.txt")
          .then((res) => {
            if (res.ok) return res.text();
            throw new Error("Failed to load static file");
          })
          .then((text) => {
            if (text && text.trim().length > 0) {
              setContractText(text);
            }
          })
          .catch((e) => console.warn("Static contract fallback failed:", e));
      });
  }, []);

  // Monitor scroll height
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Allow small tolerance (20px) for zoomed screens
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= 20;
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("iB - HSG GLOBAL Internal Bridge", 20, 20);
      doc.setFontSize(11);
      doc.text("Terms of Service and Non-Disclosure Agreement", 20, 27);
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
      doc.save("ib-NDA-contract.pdf");
      showToast("Signed contract PDF downloaded successfully!", "success");

      // 2. Upload signed PDF directly to R2
      const pdfBlob = doc.output("blob");
      const uploadFileName = `contract/Signed_Contract/contract_${profile.email}_${Date.now()}.pdf`;
      const uploadRes = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(uploadFileName)}`, {
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
        profile.email,
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
      const res = await startSigningSession(profile.email);
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
    const signUrl = `${origin}/contract/sign?sessionId=${encodeURIComponent(sessionId)}&email=${encodeURIComponent(profile.email)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(signUrl)}`;
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#EEEEEE] p-6 font-primary animate-fade-in">
      <style>{`
        .custom-scrollbar {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      <div className="w-full max-w-3xl bg-[#E5E5E5] border border-zinc-300 rounded-lg shadow-lg flex flex-col h-[90vh] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-300 bg-[#EEEEEE] rounded-t-lg">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-zinc-700" />
            <div>
              <h3 className="text-base font-bold text-zinc-950">NDA Agreement & Terms of Service</h3>
              <p className="text-[10px] text-zinc-500 font-medium">Please review the agreement and scroll to the bottom to sign</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600 font-bold px-2 py-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
            title="Sign out of your session"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>

        <div 
          className="w-full p-8 overflow-y-auto custom-scrollbar bg-zinc-50 text-zinc-700 text-xs leading-relaxed border-b border-zinc-300 whitespace-pre-wrap font-primary select-text h-[calc(90vh-136px)]"
        >
          {contractText}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[#EEEEEE] border-t border-zinc-300 rounded-b-lg">
          <span className="text-[10px] text-zinc-500 font-bold shrink-0">
            Please click "Sign Contract" to generate your signature QR code.
          </span>
          
          <div className="flex items-center gap-3">
            <CustomButton 
              type="button" 
              variant="dark"
              disabled={!scrolledToBottom || loading}
              onClick={handleSignClick}
              className="h-10 text-xs font-bold"
            >
              {loading ? "Generating QR..." : "Sign Contract"}
            </CustomButton>
          </div>
        </div>
      </div>

      {/* QR Code Handshake Dialog Overlay */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-tableFadeInOnly">
          <div className="w-full max-w-sm bg-[#E5E5E5] border border-zinc-300 rounded-lg shadow-2xl overflow-hidden flex flex-col font-primary">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-300 bg-[#EEEEEE]">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-zinc-650" />
                <h3 className="text-sm font-bold text-zinc-950">Scan QR to Sign</h3>
              </div>
              <button 
                type="button"
                onClick={handleCancelSession}
                className="text-zinc-400 hover:text-zinc-800 rounded-md p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4 text-center">
              {finalizing ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-10 h-10 text-zinc-800 animate-spin" />
                  <span className="text-sm font-bold text-zinc-800">Compiling signed PDF...</span>
                  <p className="text-xs text-zinc-500">Please wait while we secure your signature and finalize registration.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-550 leading-normal">
                    Scan the QR code below using your mobile phone camera to fill out your details and sign securely.
                  </p>

                  <div className="bg-white p-3 rounded-lg border border-zinc-300 shadow-inner flex items-center justify-center w-60 h-60">
                    <img 
                      src={getQrCodeUrl()} 
                      alt="Signature QR Code" 
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-2 bg-[#EEEEEE] px-4 py-2 rounded-full border border-zinc-300 w-fit">
                    <Hourglass className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span className="text-xs font-bold text-zinc-700">Expires in: {formatTime(timeLeft)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelSession}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer mt-1"
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

// X icon helper in case lucide doesn't load X
function X({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
