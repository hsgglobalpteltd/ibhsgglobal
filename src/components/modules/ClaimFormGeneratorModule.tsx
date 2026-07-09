"use client";

import * as React from "react";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { loadScript, loadStyle } from "@/lib/script-loader";
import {
  FileText,
  Plus,
  X,
  Trash2,
  Loader2,
  Sparkles,
  Undo,
  RotateCw,
  RotateCcw,
  Upload,
} from "lucide-react";

interface ClaimRow {
  id: number;
  desc: string;
  amt: string;
  type: "EXCL" | "INCL" | "NONE";
  remark: string;
}

interface ReceiptImage {
  src: string;
  name: string;
  extracted: boolean;
  type: string;
}

const GST_RATE = 0.09;

export function ClaimFormGeneratorModule() {
  const [scriptsReady, setScriptsReady] = React.useState(false);
  const [company, setCompany] = React.useState("HSG Global Pte. Ltd.");
  const [project, setProject] = React.useState("");
  const [employeeName, setEmployeeName] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [claimDate, setClaimDate] = React.useState("");

  const [receiptImages, setReceiptImages] = React.useState<ReceiptImage[]>([]);
  const [claimRows, setClaimRows] = React.useState<ClaimRow[]>([
    { id: 1, desc: "", amt: "", type: "EXCL", remark: "" },
  ]);

  // Cropper states
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState("");
  const [cropFileName, setCropFileName] = React.useState("");
  const [cropFileType, setCropFileType] = React.useState("");
  const [baseRotation, setBaseRotation] = React.useState(0);
  const [fineRotation, setFineRotation] = React.useState(0);

  // Loading states
  const [isScanningIndex, setIsScanningIndex] = React.useState<number | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const cropperRef = React.useRef<any>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Hidden print nodes refs
  const page1Ref = React.useRef<HTMLDivElement>(null);
  const page2Ref = React.useRef<HTMLDivElement>(null);

  // Set default date on mount
  React.useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setClaimDate(today);
  }, []);

  // Load scripts on mount
  React.useEffect(() => {
    async function initScripts() {
      try {
        await loadStyle("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js");

        if (
          typeof window !== "undefined" &&
          (window as any).jspdf &&
          (window as any).html2canvas &&
          (window as any).Cropper
        ) {
          setScriptsReady(true);
        } else {
          showToast("Failed to initialize claim compiler libraries", "error");
        }
      } catch (err: any) {
        showToast("Error loading claim compiler scripts: " + err.message, "error");
      }
    }
    initScripts();
  }, []);

  const handleResetForm = () => {
    setCompany("HSG Global Pte. Ltd.");
    setProject("");
    setEmployeeName("");
    setPosition("");
    setClaimDate(new Date().toISOString().split("T")[0]);
    setReceiptImages([]);
    setClaimRows([{ id: 1, desc: "", amt: "", type: "EXCL", remark: "" }]);
    showToast("Form fields reset to default.", "info");
  };

  // Add Item Row
  const handleAddClaimRow = () => {
    if (claimRows.length >= 8) {
      showToast("Maximum of 8 items allowed per claim form layout.", "warning");
      return;
    }
    const maxId = claimRows.length > 0 ? Math.max(...claimRows.map((r) => r.id)) : 0;
    setClaimRows([
      ...claimRows,
      { id: maxId + 1, desc: "", amt: "", type: "EXCL", remark: "" },
    ]);
  };

  const handleRemoveClaimRow = (id: number) => {
    if (claimRows.length === 1) {
      setClaimRows([{ id: 1, desc: "", amt: "", type: "EXCL", remark: "" }]);
    } else {
      setClaimRows(claimRows.filter((r) => r.id !== id));
    }
  };

  const handleRowChange = (id: number, field: keyof ClaimRow, value: any) => {
    setClaimRows(
      claimRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Upload handler
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (receiptImages.length >= 8) {
      showToast("Maximum of 8 documents allowed.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropSrc(event.target.result as string);
        setCropFileName(file.name);
        setCropFileType(file.type);
        setBaseRotation(0);
        setFineRotation(0);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Instantiate Cropper on modal open
  React.useEffect(() => {
    if (showCropModal && imageRef.current && (window as any).Cropper) {
      const Cropper = (window as any).Cropper;
      if (cropperRef.current) {
        cropperRef.current.destroy();
      }

      cropperRef.current = new Cropper(imageRef.current, {
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        aspectRatio: NaN,
      });
    }

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [showCropModal, cropSrc]);

  const handleRotateLeft = () => {
    const rot = (baseRotation - 90) % 360;
    setBaseRotation(rot);
    cropperRef.current?.rotateTo(rot + fineRotation);
  };

  const handleRotateRight = () => {
    const rot = (baseRotation + 90) % 360;
    setBaseRotation(rot);
    cropperRef.current?.rotateTo(rot + fineRotation);
  };

  const handleRotateSlider = (val: number) => {
    setFineRotation(val);
    cropperRef.current?.rotateTo(baseRotation + val);
  };

  const applyCrop = () => {
    if (!cropperRef.current) return;
    const canvas = cropperRef.current.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 });
    const croppedSrc = canvas.toDataURL(cropFileType || "image/jpeg");

    setReceiptImages([
      ...receiptImages,
      { src: croppedSrc, name: cropFileName, extracted: false, type: cropFileType },
    ]);
    setShowCropModal(false);
    showToast("Receipt document cropped and added!", "success");
  };

  const deleteReceipt = (index: number) => {
    setReceiptImages(receiptImages.filter((_, idx) => idx !== index));
  };

  // AI OCR Scanning
  const triggerExtraction = async (idx: number) => {
    const file = receiptImages[idx];
    setIsScanningIndex(idx);

    try {
      const base64Data = file.src.split(",")[1];
      const response = await fetch(
        "https://ib.hsgglobalpteltd.workers.dev/api/admin/ocr",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Data,
            type: file.type || "image/jpeg",
          }),
        }
      );

      if (!response.ok) {
        let errMsg = "OCR service returned error status";
        try {
          const errRes = await response.json();
          if (errRes && errRes.error) {
            errMsg = errRes.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const res = await response.json();
      if (!res.success) throw new Error(res.error || "Failed to scan receipt");
      const data = res.data;
      if (!data) {
        throw new Error(res.error || "OCR response did not contain data");
      }

      // Mark as extracted and append row
      const updated = receiptImages.map((img, i) => (i === idx ? { ...img, extracted: true } : img));
      setReceiptImages(updated);

      const maxId = claimRows.length > 0 ? Math.max(...claimRows.map((r) => r.id)) : 0;
      const newRow: ClaimRow = {
        id: maxId + 1,
        desc: data.merchant || "RECEIPT CHARGES",
        amt: (parseFloat(data.total) || 0.0).toFixed(2),
        type: data.is_gst ? "INCL" : "EXCL",
        remark: "",
      };

      // Append row or fill the first row if it's empty
      if (claimRows.length === 1 && claimRows[0].desc === "" && claimRows[0].amt === "") {
        setClaimRows([newRow]);
      } else {
        setClaimRows([...claimRows, newRow]);
      }

      showToast("Receipt data parsed successfully!", "success");
    } catch (err: any) {
      console.error("AI scanning OCR failed:", err);
      showToast("OCR Scanner failed. Please check System Settings.", "error");
    } finally {
      setIsScanningIndex(null);
    }
  };

  // Calculations
  const calculateTotals = () => {
    let b = 0,
      g = 0,
      t = 0;
    claimRows.forEach((row) => {
      const amt = parseFloat(row.amt) || 0;
      const gst =
        row.type === "EXCL"
          ? amt * GST_RATE
          : row.type === "INCL"
          ? amt - amt / (1 + GST_RATE)
          : 0;
      const before = row.type === "EXCL" ? amt : amt - gst;
      const total = row.type === "EXCL" ? amt + gst : amt;

      b += before;
      g += gst;
      t += total;
    });

    return {
      before: b.toFixed(2),
      gst: g.toFixed(2),
      total: t.toFixed(2),
    };
  };

  const totals = calculateTotals();

  // Print PDF Trigger
  const handleGeneratePDF = async () => {
    const newTab = window.open("about:blank", "_blank");
    if (!newTab) {
      showToast("Please allow popups to preview the PDF in a new tab.", "warning");
      return;
    }

    newTab.document.write(`
      <title>Generating PDF...</title>
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; color: #475569;">
          <div style="width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top: 4px solid #14121e; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
          <span style="font-size: 14px; font-weight: 600; letter-spacing: -0.2px;">Assembling high-fidelity claim report...</span>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Rendering Page Vector Layers</p>
          <style>
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
      </div>
    `);

    setIsGenerating(true);
    try {
      const { jsPDF } = (window as any).jspdf;
      const html2canvas = (window as any).html2canvas;

      const doc = new jsPDF("p", "mm", "a4");

      // Render Page 1
      if (!page1Ref.current) throw new Error("Page 1 ref is empty");
      const canvas1 = await html2canvas(page1Ref.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData1 = canvas1.toDataURL("image/jpeg", 0.95);
      doc.addImage(imgData1, "JPEG", 0, 0, 210, 297);

      // Render Page 2 (Receipts) if any
      if (receiptImages.length > 0) {
        doc.addPage();
        if (!page2Ref.current) throw new Error("Page 2 ref is empty");
        const canvas2 = await html2canvas(page2Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });
        const imgData2 = canvas2.toDataURL("image/jpeg", 0.95);
        doc.addImage(imgData2, "JPEG", 0, 0, 210, 297);
      }

      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      newTab.location.href = blobUrl;
      showToast("Expenses Claim PDF generated in a new tab!", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      newTab.close();
      showToast("Failed to compile PDF: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!scriptsReady) {
    return (
      <div className="flex h-[calc(100vh-135px)] items-center justify-center p-6 font-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
          <span className="text-zinc-500 text-sm font-semibold italic">
            Loading claim compiler libraries...
          </span>
        </div>
      </div>
    );
  }

  // Formatting date for offscreen PDF display
  let formattedDisplayDate = "";
  if (claimDate) {
    const parts = claimDate.split("-");
    formattedDisplayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : claimDate;
  }

  // Grid styling for Supporting Documents on Page 2
  let gridCols = "1fr";
  let imgHeight = "950px";
  const count = receiptImages.length;
  if (count === 2) {
    gridCols = "1fr 1fr";
    imgHeight = "950px";
  } else if (count === 3 || count === 4) {
    gridCols = "1fr 1fr";
    imgHeight = "460px";
  } else if (count >= 5) {
    gridCols = "1fr 1fr";
    imgHeight = "220px";
  }

  const isFormValid =
    company.trim() !== "" &&
    project.trim() !== "" &&
    employeeName.trim() !== "" &&
    position.trim() !== "" &&
    claimDate !== "" &&
    claimRows.length > 0 &&
    claimRows.every((row) => row.desc.trim() !== "" && parseFloat(row.amt) > 0);

  return (
    <div className="h-[calc(100vh-135px)] flex flex-col font-primary pt-6 px-6 pb-2">
      {/* Scrollable Content Container */}
      <div className="flex-grow overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          
          {/* Left Side: Claim Details Panel (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col gap-5 border-r border-zinc-300/40 pr-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-widest pl-1">
                Claim Details
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                  Site / Project / Dept
                </label>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. HQ - Operations"
                  className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                  Employee Name
                </label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Employee Full Name"
                  className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Job Role"
                    className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                    Claim Date
                  </label>
                  <input
                    type="date"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Receipts Upload Panel */}
            <div className="border border-zinc-300 rounded-lg p-3 bg-white flex flex-col gap-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                Receipts Attachment (Max 8)
              </span>

              <CustomButton
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                className="w-full h-9 text-xs font-bold uppercase tracking-wider"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Upload Receipt
              </CustomButton>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleReceiptUpload}
                accept="image/*"
                className="hidden"
              />
 
              {receiptImages.length > 0 && (
                <div className="flex flex-col gap-1.5 h-[96px] min-h-[96px] max-h-[96px] overflow-y-auto pr-1 border border-zinc-200/50 rounded-lg p-1.5 bg-zinc-50/20">
                  {receiptImages.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2 overflow-hidden w-[60%]">
                        <span className="text-[9px] font-semibold text-zinc-700 truncate block">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isScanningIndex === idx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                        ) : file.extracted ? (
                          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 uppercase">
                            Scanned
                          </span>
                        ) : (
                          <button
                            onClick={() => triggerExtraction(idx)}
                            className="text-[8px] font-bold text-zinc-700 hover:text-zinc-950 bg-zinc-200 border border-zinc-300 px-1 py-0.5 rounded uppercase"
                          >
                            Scan
                          </button>
                        )}
                        <button
                          onClick={() => deleteReceipt(idx)}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Claim Particulars Table (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-4 pl-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">
                  Claim Particulars
                </h2>
                <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">
                  Itemized expenses list (Maximum 8 items)
                </p>
              </div>

              <CustomButton
                onClick={handleAddClaimRow}
                variant="secondary"
                disabled={claimRows.length >= 8}
                className="h-8"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </CustomButton>
            </div>

            {/* Custom Input Table (Styled like DataTable component) */}
            <div className="border border-zinc-300 rounded-lg bg-white shadow-xs max-h-[425px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-300 text-left sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-10">
                      #
                    </th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-[40%]">
                      Particulars
                    </th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-28">
                      Amount
                    </th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-28">
                      GST Type
                    </th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase">
                      Remarks
                    </th>
                    <th className="p-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {claimRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50">
                      <td className="p-3 text-center text-xs font-bold text-zinc-400">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <textarea
                          rows={1}
                          value={row.desc}
                          onChange={(e) => handleRowChange(row.id, "desc", e.target.value)}
                          placeholder="Particulars description..."
                          className="w-full p-2 border border-zinc-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white resize-none min-h-[38px] leading-normal"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded-lg px-2 h-[38px] focus-within:ring-1 focus-within:ring-zinc-400">
                          <span className="text-xs font-bold text-zinc-400 select-none">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={row.amt}
                            onChange={(e) => handleRowChange(row.id, "amt", e.target.value)}
                            placeholder="0.00"
                            className="w-full text-xs font-bold text-zinc-800 focus:outline-none bg-transparent"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <select
                          value={row.type}
                          onChange={(e) => handleRowChange(row.id, "type", e.target.value)}
                          className="h-[38px] w-full px-2 border border-zinc-300 rounded-lg text-xs font-bold text-zinc-800 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        >
                          <option value="EXCL">+ GST</option>
                          <option value="INCL">inc. GST</option>
                          <option value="NONE">No. GST</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <textarea
                          rows={1}
                          value={row.remark}
                          onChange={(e) => handleRowChange(row.id, "remark", e.target.value)}
                          placeholder="Project remarks..."
                          className="w-full p-2 border border-zinc-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white resize-none min-h-[38px] leading-normal"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveClaimRow(row.id)}
                          className={`p-1.5 rounded-lg border border-zinc-300 bg-[#EEEEEE] text-zinc-500 hover:text-red-500 transition-colors shadow-xs ${
                            claimRows.length === 1 && idx === 0 ? "invisible" : ""
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Footer */}
      <div className="border-t border-slate-200 pt-4 mt-auto flex flex-col sm:flex-row justify-between items-center bg-white gap-4 z-10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <CustomButton
            onClick={handleGeneratePDF}
            variant="dark"
            disabled={!isFormValid || isGenerating}
            className="w-full sm:w-64 h-10 text-xs font-bold uppercase tracking-wider shadow-md"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Form...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Claim PDF
              </>
            )}
          </CustomButton>

          <CustomButton
            onClick={handleResetForm}
            variant="danger"
            className="h-10 px-4 text-xs font-bold uppercase tracking-wider"
          >
            Reset
          </CustomButton>
        </div>

        <div className="text-zinc-600 text-xs font-bold uppercase tracking-wider flex items-center">
          Estimated Net Total:
          <span className="font-extrabold text-zinc-950 ml-2 text-base">
            $ {totals.total}
          </span>
        </div>
      </div>

      {/* CROP & ROTATE MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-zinc-300 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] font-primary animate-pop-in">
            
            {/* Header */}
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-widest">
                Crop & Rotate Receipt
              </h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="w-7 h-7 rounded-lg border border-zinc-300 bg-[#EEEEEE] hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cropper View Area */}
            <div className="flex-grow p-6 bg-zinc-100 flex items-center justify-center overflow-hidden min-h-[300px] max-h-[50vh]">
              <div className="w-full h-full max-h-[350px] flex justify-center items-center">
                <img
                  ref={imageRef}
                  src={cropSrc}
                  alt="To Crop"
                  style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
                />
              </div>
            </div>

            {/* Adjust Controls */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-col gap-4">
              <div className="flex items-center justify-center gap-6">
                
                {/* Rotate Left */}
                <button
                  onClick={handleRotateLeft}
                  className="p-2.5 bg-white border border-zinc-200 hover:border-zinc-500 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-4 h-4 text-zinc-700" />
                </button>

                {/* Rotate Fine Slider */}
                <div className="flex items-center gap-3 flex-grow max-w-xs">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    Fine Angle
                  </span>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={fineRotation}
                    onChange={(e) => handleRotateSlider(parseInt(e.target.value))}
                    className="w-full accent-zinc-800 h-1 rounded-lg bg-zinc-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-zinc-600 w-10 text-right">
                    {fineRotation}°
                  </span>
                </div>

                {/* Rotate Right */}
                <button
                  onClick={handleRotateRight}
                  className="p-2.5 bg-white border border-zinc-200 hover:border-zinc-500 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-4 h-4 text-zinc-700" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <CustomButton variant="secondary" onClick={() => setShowCropModal(false)}>
                  Cancel
                </CustomButton>
                <CustomButton variant="dark" onClick={applyCrop}>
                  Apply Crop
                </CustomButton>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* OFF-SCREEN RENDERING CONTAINER FOR PDF GENERATION */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "100vw",
          width: "794px",
          height: "1123px",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: -9999,
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        <div
          id="generated-view"
          style={{
            width: "794px",
            height: "1123px",
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        >
          
          {/* PAGE 1: CLAIM FORM */}
          <div
            ref={page1Ref}
            className="pdf-page"
            style={{
              width: "794px",
              height: "1123px",
              padding: "40px",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "11px",
                lineHeight: "1.4",
                padding: 0,
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#000000",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
              }}
            >
              <div>
                {/* Top Section */}
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "12px", whiteSpace: "nowrap" }}>
                      Company Name:
                    </span>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingLeft: "8px",
                      }}
                    >
                      {company.toUpperCase()}
                    </div>
                  </div>
                  <h1
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      textAlign: "center",
                      textDecoration: "underline",
                      textTransform: "uppercase",
                      letterSpacing: "2px",
                      marginTop: "15px",
                      marginBottom: "10px",
                    }}
                  >
                    EXPENSES CLAIM FORM
                  </h1>
                </div>

                {/* Site details and Employee Info */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)",
                    gap: "10px 20px",
                    marginBottom: "15px",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ gridColumn: "span 8", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                      Site / Project / Dept:
                    </span>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        paddingLeft: "8px",
                        minHeight: "18px",
                      }}
                    >
                      {project.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 4", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Date:</span>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        paddingLeft: "8px",
                        minHeight: "18px",
                      }}
                    >
                      {formattedDisplayDate}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 8", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Name:</span>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        paddingLeft: "8px",
                        minHeight: "18px",
                      }}
                    >
                      {employeeName.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 4", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Position:</span>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        paddingLeft: "8px",
                        minHeight: "18px",
                      }}
                    >
                      {position.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Expenses Table */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid black",
                    marginBottom: "15px",
                    fontSize: "10px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6", textAlign: "center", height: "28px" }}>
                      <th
                        style={{
                          width: "35px",
                          padding: "4px",
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "black",
                          border: "1px solid black",
                          borderBottom: "2px solid black",
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          padding: "4px",
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "black",
                          border: "1px solid black",
                          borderBottom: "2px solid black",
                        }}
                      >
                        Particulars
                      </th>
                      <th
                        style={{
                          width: "100px",
                          padding: "4px",
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "black",
                          border: "1px solid black",
                          borderBottom: "2px solid black",
                        }}
                      >
                        Amount before GST
                      </th>
                      <th
                        style={{
                          width: "60px",
                          padding: "4px",
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "black",
                          border: "1px solid black",
                          borderBottom: "2px solid black",
                        }}
                      >
                        GST
                      </th>
                      <th
                        style={{
                          width: "110px",
                          padding: "4px",
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "black",
                          border: "1px solid black",
                          borderBottom: "2px solid black",
                        }}
                      >
                        Total Amount with GST
                      </th>
                      <th
                        style={{
                          width: "120px",
                          padding: "4px",
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "black",
                          border: "1px solid black",
                          borderBottom: "2px solid black",
                        }}
                      >
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimRows
                      .filter((row) => row.desc.trim() !== "" || parseFloat(row.amt) > 0)
                      .map((row, i) => {
                        const amt = parseFloat(row.amt) || 0;
                        const gst =
                          row.type === "EXCL"
                            ? amt * GST_RATE
                            : row.type === "INCL"
                            ? amt - amt / (1 + GST_RATE)
                            : 0;
                        const before = row.type === "EXCL" ? amt : amt - gst;
                        const total = row.type === "EXCL" ? amt + gst : amt;

                        return (
                          <tr key={row.id} style={{ height: "32px" }}>
                            <td
                              style={{
                                textAlign: "center",
                                fontWeight: "bold",
                                verticalAlign: "top",
                                paddingTop: "6px",
                                border: "1px solid black",
                              }}
                            >
                              {i + 1}
                            </td>
                            <td
                              style={{
                                padding: "6px",
                                textAlign: "left",
                                verticalAlign: "top",
                                wordBreak: "break-all",
                                border: "1px solid black",
                              }}
                            >
                              {row.desc}
                            </td>
                            <td
                              style={{
                                padding: "6px",
                                textAlign: "right",
                                verticalAlign: "top",
                                whiteSpace: "nowrap",
                                border: "1px solid black",
                              }}
                            >
                              $ {before.toFixed(2)}
                            </td>
                            <td
                              style={{
                                padding: "6px",
                                textAlign: "right",
                                verticalAlign: "top",
                                whiteSpace: "nowrap",
                                border: "1px solid black",
                              }}
                            >
                              $ {gst.toFixed(2)}
                            </td>
                            <td
                              style={{
                                padding: "6px",
                                textAlign: "right",
                                fontWeight: "bold",
                                verticalAlign: "top",
                                whiteSpace: "nowrap",
                                border: "1px solid black",
                              }}
                            >
                              $ {total.toFixed(2)}
                            </td>
                            <td
                              style={{
                                padding: "6px",
                                textAlign: "left",
                                fontSize: "9px",
                                verticalAlign: "top",
                                wordBreak: "break-all",
                                border: "1px solid black",
                              }}
                            >
                              {row.remark}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f9fafb", height: "32px" }}>
                      <td
                        colSpan={2}
                        style={{
                          textAlign: "right",
                          paddingRight: "15px",
                          textTransform: "uppercase",
                          border: "1px solid black",
                          borderTop: "2px solid black",
                        }}
                      >
                        TOTAL
                      </td>
                      <td
                        style={{
                          padding: "6px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          border: "1px solid black",
                          borderTop: "2px solid black",
                        }}
                      >
                        $ {totals.before}
                      </td>
                      <td
                        style={{
                          padding: "6px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          border: "1px solid black",
                          borderTop: "2px solid black",
                        }}
                      >
                        $ {totals.gst}
                      </td>
                      <td
                        style={{
                          padding: "6px",
                          textAlign: "right",
                          fontWeight: "900",
                          whiteSpace: "nowrap",
                          border: "1px solid black",
                          borderTop: "2px solid black",
                        }}
                      >
                        $ {totals.total}
                      </td>
                      <td style={{ padding: "6px", border: "1px solid black", borderTop: "2px solid black" }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Approval Section */}
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "10px",
                    fontSize: "10px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "15px" }}>
                    {/* Supervisor Approval */}
                    <div
                      style={{
                        border: "1.5px solid black",
                        padding: "12px",
                        height: "210px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxSizing: "border-box",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontWeight: "bold",
                            fontStyle: "italic",
                            marginBottom: "2px",
                            marginTop: 0,
                            textTransform: "uppercase",
                            fontSize: "11px",
                          }}
                        >
                          For approval
                        </p>
                        <p style={{ margin: 0, fontSize: "9px", color: "#4b5563" }}>Supervisor/ Manager</p>
                      </div>
                      <div style={{ flexGrow: 1, borderBottom: "1.5px solid black", marginBottom: "5px", minHeight: "50px" }}></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ textAlign: "center", marginBottom: "5px" }}>
                          <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "bold" }}>Signature</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontWeight: "bold" }}>Name:</span>
                          <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontWeight: "bold" }}>Date:</span>
                          <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Claiming By */}
                    <div
                      style={{
                        border: "1.5px solid black",
                        padding: "12px",
                        height: "110px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxSizing: "border-box",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: "bold",
                          marginBottom: 0,
                          textTransform: "uppercase",
                          marginTop: 0,
                          fontStyle: "italic",
                          fontSize: "11px",
                        }}
                      >
                        Claiming by
                      </p>
                      <div style={{ flexGrow: 1, borderBottom: "1.5px solid black", marginBottom: "5px", minHeight: "35px" }}></div>
                      <p style={{ fontWeight: "bold", textAlign: "center", marginTop: 0, fontSize: "9px", textTransform: "uppercase" }}>
                        SIGNATURE, DATE
                      </p>
                    </div>
                  </div>

                  {/* Finance Dept */}
                  <div
                    style={{
                      border: "1.5px solid black",
                      padding: "12px",
                      height: "335px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxSizing: "border-box",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontWeight: "bold",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          marginTop: 0,
                          fontStyle: "italic",
                          fontSize: "11px",
                        }}
                      >
                        For Finance Dept.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontWeight: "bold", color: "#4b5563", fontSize: "9px" }}>Remarks:</span>
                          <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                        </div>
                        <div style={{ borderBottom: "1px solid black", minHeight: "14px", marginTop: "4px" }}></div>
                      </div>

                      {/* GST Expenses Box */}
                      <div style={{ border: "1px solid black", marginBottom: "8px", marginTop: "10px" }}>
                        <div
                          style={{
                            fontSize: "8px",
                            fontWeight: "bold",
                            textAlign: "center",
                            borderBottom: "1px solid black",
                            backgroundColor: "#f3f4f6",
                            padding: "2px 0",
                            textTransform: "uppercase",
                          }}
                        >
                          GST Expenses
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "9px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid black" }}>
                              <th style={{ borderRight: "1px solid black", width: "33.3%", padding: "3px", fontWeight: "bold" }}>Amt</th>
                              <th style={{ borderRight: "1px solid black", width: "33.3%", padding: "3px", fontWeight: "bold" }}>GST</th>
                              <th style={{ width: "33.3%", padding: "3px", fontWeight: "bold" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ height: "18px" }}>
                              <td style={{ borderRight: "1px solid black" }}></td>
                              <td style={{ borderRight: "1px solid black" }}></td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Non-GST Expenses Box */}
                      <div style={{ border: "1px solid black", marginBottom: "8px" }}>
                        <div
                          style={{
                            fontSize: "8px",
                            fontWeight: "bold",
                            textAlign: "center",
                            borderBottom: "1px solid black",
                            backgroundColor: "#f3f4f6",
                            padding: "2px 0",
                            textTransform: "uppercase",
                          }}
                        >
                          Non-GST Expenses
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "9px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid black" }}>
                              <th style={{ borderRight: "1px solid black", width: "50%", padding: "3px", fontWeight: "bold" }}>Amt</th>
                              <th style={{ width: "50%", padding: "3px", fontWeight: "bold" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ height: "18px" }}>
                              <td style={{ borderRight: "1px solid black" }}></td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "5px" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                        <span style={{ fontWeight: "bold" }}>Check by:</span>
                        <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                        <span style={{ fontWeight: "bold" }}>Date:</span>
                        <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ fontSize: "8px", lineHeight: "1.4", borderTop: "0.5px solid #ccc", paddingTop: "6px", color: "#4b5563" }}>
                  <p style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: "3px", marginTop: 0, color: "#1f2937", textTransform: "uppercase" }}>
                    Note:
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px", marginBottom: "1px" }}>
                    <span>1</span>
                    <span>To expedite your petty cash, kindly proceed to your dept. head for approval before submitting.</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px", marginBottom: "1px" }}>
                    <span>2</span>
                    <span>Purchase of materials for site/projects must issued RFA and PO and attach all the related documents.</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px", marginBottom: "1px" }}>
                    <span>3</span>
                    <span>To indicate locations, purposes & description of items should be clearly stated before submission.</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px" }}>
                    <span>4</span>
                    <span>Claims must be submit within <strong style={{ color: "black" }}>2 months</strong>, total expenses claim more than <strong style={{ color: "black" }}>$500.00</strong> will issued by cheque.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2: RECEIPTS CROP */}
          {receiptImages.length > 0 && (
            <div
              ref={page2Ref}
              className="pdf-page page-break"
              style={{
                width: "794px",
                height: "1123px",
                padding: "40px",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  padding: 0,
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <div>
                  <div style={{ textAlign: "center", marginBottom: "25px" }}>
                    <h2 style={{ fontSize: "14px", fontWeight: "bold", textDecoration: "underline", textTransform: "uppercase" }}>
                      Supporting Documents (Receipts)
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: gridCols,
                      gap: "20px",
                      width: "100%",
                      justifyItems: "center",
                      alignItems: "center",
                    }}
                  >
                    {receiptImages.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: "100%",
                          height: imgHeight,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={file.src}
                          alt={file.name}
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "8px",
                    color: "#cbd5e1",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginTop: "20px",
                  }}
                >
                  End of Supporting Documents
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
      
    </div>
  );
}
