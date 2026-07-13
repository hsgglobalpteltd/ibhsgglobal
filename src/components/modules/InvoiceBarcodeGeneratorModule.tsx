"use client";

import * as React from "react";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { loadScript } from "@/lib/script-loader";
import { FileText, Trash2, Barcode, Upload, Loader2 } from "lucide-react";

export function InvoiceBarcodeGeneratorModule() {
  const [scriptsReady, setScriptsReady] = React.useState(false);
  const [currentPdfData, setCurrentPdfData] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = React.useState<string>("");
  const [statusMsg, setStatusMsg] = React.useState<string>("");
  const [statusType, setStatusType] = React.useState<"success" | "error" | "info" | "">("");
  const [isDragging, setIsDragging] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Load scripts on mount
  React.useEffect(() => {
    async function initScripts() {
      try {
        await loadScript("https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js");

        if (
          typeof window !== "undefined" &&
          (window as any).PDFLib &&
          (window as any).JsBarcode &&
          (window as any).pdfjsLib
        ) {
          const pdfjs = (window as any).pdfjsLib;
          pdfjs.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
          setScriptsReady(true);
        } else {
          showToast("Failed to initialize PDF libraries", "error");
        }
      } catch (err: any) {
        showToast("Error loading PDF libraries: " + err.message, "error");
      }
    }
    initScripts();
  }, []);

  // Restore session data
  React.useEffect(() => {
    if (!scriptsReady) return;
    const savedPdf = localStorage.getItem("last_invoice_pdf");
    const savedNum = localStorage.getItem("last_invoice_number");

    if (savedPdf) {
      setCurrentPdfData(savedPdf);
      setFileName("Previously uploaded PDF");
    }
    if (savedNum) {
      setInvoiceNumber(savedNum);
    }
  }, [scriptsReady]);

  const resetTool = () => {
    localStorage.removeItem("last_invoice_pdf");
    localStorage.removeItem("last_invoice_number");
    setCurrentPdfData(null);
    setFileName("");
    setInvoiceNumber("");
    setStatusMsg("");
    setStatusType("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const extractInvoiceNumber = async (base64: string): Promise<string | null> => {
    setIsScanning(true);
    setStatusMsg("Scanning document for invoice number...");
    setStatusType("info");

    try {
      const pdfjs = (window as any).pdfjsLib;
      const loadingTask = pdfjs.getDocument(base64);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const fullText = textContent.items.map((item: any) => item.str).join(" ");

      // Regex for exactly 9 digits
      const match = fullText.match(/\d{9}/);
      setIsScanning(false);
      if (match) {
        return match[0];
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setIsScanning(false);
    }
    return null;
  };

  const processFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setStatusMsg("Please upload a PDF file only.");
      setStatusType("error");
      showToast("Invalid file type. PDF required.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        localStorage.setItem("last_invoice_pdf", base64);
        setCurrentPdfData(base64);
        setFileName(file.name);

        const detectedNum = await extractInvoiceNumber(base64);
        if (detectedNum) {
          setInvoiceNumber(detectedNum);
          localStorage.setItem("last_invoice_number", detectedNum);
          setStatusMsg("Invoice Number Auto-Detected!");
          setStatusType("success");
          showToast("Invoice number scanned successfully!", "success");
        } else {
          setStatusMsg("File ready. Please enter Invoice # manually.");
          setStatusType("success");
          showToast("Document loaded. No invoice number detected.", "info");
        }
      } catch (err) {
        setCurrentPdfData(base64);
        setFileName(file.name);
        setStatusMsg("File ready (session only)");
        setStatusType("success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleInvoiceNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setInvoiceNumber(val);
    localStorage.setItem("last_invoice_number", val);

    if (val.length === 9) {
      setStatusMsg("Ready to generate barcode");
      setStatusType("success");
    } else if (val.length > 0) {
      setStatusMsg("Enter exactly 9 digits");
      setStatusType("info");
    } else {
      setStatusMsg("");
      setStatusType("");
    }
  };

  const handleGenerate = async () => {
    if (invoiceNumber.length !== 9 || !currentPdfData) return;

    setIsGenerating(true);
    try {
      const JsBarcode = (window as any).JsBarcode;
      const { PDFDocument } = (window as any).PDFLib;

      // 1. Generate Barcode Image (Code 39)
      if (!canvasRef.current) throw new Error("Barcode canvas not available");
      JsBarcode(canvasRef.current, invoiceNumber, {
        format: "CODE39",
        displayValue: false,
        width: 2,
        height: 100,
        margin: 10,
        background: "#ffffff",
      });

      const barcodeImageUrl = canvasRef.current.toDataURL("image/png");

      // 2. Load PDF and Embed Barcode
      const pdfBytesRaw = await fetch(currentPdfData).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytesRaw);

      const barcodeImage = await pdfDoc.embedPng(barcodeImageUrl);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Define barcode dimensions and position (Bottom Right)
      const barcodeWidth = 150;
      const barcodeHeight = 45;
      const margin = 20;

      firstPage.drawImage(barcodeImage, {
        x: width - barcodeWidth - margin,
        y: margin,
        width: barcodeWidth,
        height: barcodeHeight,
      });

      // 3. Save and Open
      const pdfBytesFinal = await pdfDoc.save();
      const blob = new Blob([pdfBytesFinal], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Reset and display success
      resetTool();
      showToast("Invoice barcode injected and opened!", "success");
    } catch (err: any) {
      console.error(err);
      setStatusMsg("Error: " + err.message);
      setStatusType("error");
      showToast("Failed to inject barcode: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!scriptsReady) {
    return (
      <div className="flex flex-1 h-full items-center justify-center p-6 font-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
          <span className="text-zinc-500 text-sm font-semibold italic">
            Loading barcode processor libraries...
          </span>
        </div>
      </div>
    );
  }

  const isFormValid = currentPdfData && invoiceNumber.length === 9 && !isScanning;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative min-w-0">
      <div className="content-body flex-1 w-full overflow-y-auto pr-1 pb-4 flex items-center justify-center">
        <div className="max-w-md w-full flex flex-col gap-6">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            currentPdfData
              ? "border-emerald-500 bg-emerald-50/10"
              : isDragging
              ? "border-blue-500 bg-[#F0F4F9]"
              : "border-slate-300 bg-[#F0F4F9]/40 hover:border-blue-400 hover:bg-[#F0F4F9]/70"
          }`}
        >
          {currentPdfData && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetTool();
              }}
              className="absolute top-3 right-3 p-1.5 rounded border border-slate-200 bg-white text-red-600 hover:bg-red-50 transition-colors shadow-xs"
              title="Clear Uploaded PDF"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div
            className={`w-12 h-12 rounded border border-slate-100 bg-[#F0F4F9] flex items-center justify-center shadow-xs mb-3 ${
              currentPdfData ? "text-emerald-600" : "text-zinc-500"
            }`}
          >
            {isScanning ? (
              <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
            ) : (
              <FileText className="w-6 h-6" />
            )}
          </div>

          <span className="text-xs font-bold text-zinc-700 text-center truncate max-w-xs">
            {fileName || "Click or Drag PDF invoice here"}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
            {isScanning ? "Scanning PDF..." : "PDF file formats only"}
          </span>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />
        </div>

        {/* Controls */}
        {currentPdfData && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                Invoice Number (9 Digits)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={handleInvoiceNumberChange}
                maxLength={9}
                placeholder="000000000"
                className="h-10 w-full px-4 border border-zinc-300 rounded-lg text-center font-bold tracking-widest text-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
              />
              {statusMsg && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider text-center mt-1 ${
                    statusType === "success"
                      ? "text-emerald-600"
                      : statusType === "error"
                      ? "text-red-600"
                      : "text-zinc-500"
                  }`}
                >
                  {statusMsg}
                </span>
              )}
            </div>

            <CustomButton
              onClick={handleGenerate}
              variant="dark"
              disabled={!isFormValid || isGenerating}
              className="w-full h-10 text-xs font-bold uppercase tracking-wider mt-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Barcode className="w-4 h-4" />
                  Generate & Ingest Barcode
                </>
              )}
            </CustomButton>
          </div>
        )}
      </div>
      </div>

      {/* Hidden Canvas for JsBarcode generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
