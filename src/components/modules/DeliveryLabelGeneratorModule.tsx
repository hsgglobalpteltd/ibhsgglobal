"use client";

import * as React from "react";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { loadScript } from "@/lib/script-loader";
import { FileText, Plus, X, Loader2, ArrowLeftRight } from "lucide-react";

interface PackingItem {
  desc: string;
  qty: string;
}

export function DeliveryLabelGeneratorModule() {
  const [scriptsReady, setScriptsReady] = React.useState(false);
  const [orientation, setOrientation] = React.useState<"p" | "l">("p");
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverAddress, setReceiverAddress] = React.useState("");
  const [showFrom, setShowFrom] = React.useState(true);
  const [editSender, setEditSender] = React.useState(false);
  const [senderName, setSenderName] = React.useState("HSG Global Pte Ltd");
  const [senderAddress, setSenderAddress] = React.useState(
    "9 Eunos Ave 8A, EUNOS INDUSTRIAL ESTATE, Singapore 409461"
  );
  const [showPackingList, setShowPackingList] = React.useState(false);
  const [packingItems, setPackingItems] = React.useState<PackingItem[]>([{ desc: "", qty: "" }]);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Load jspdf on mount
  React.useEffect(() => {
    async function initScripts() {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        if (typeof window !== "undefined" && (window as any).jspdf) {
          setScriptsReady(true);
        } else {
          showToast("Failed to initialize PDF compilation library", "error");
        }
      } catch (err: any) {
        showToast("Error loading PDF compiler: " + err.message, "error");
      }
    }
    initScripts();
  }, []);

  const handleAddItem = () => {
    if (packingItems.length >= 7) {
      showToast("Maximum of 7 items allowed in the packing list", "warning");
      return;
    }
    setPackingItems([...packingItems, { desc: "", qty: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (packingItems.length === 1) {
      setPackingItems([{ desc: "", qty: "" }]);
    } else {
      setPackingItems(packingItems.filter((_, idx) => idx !== index));
    }
  };

  const handleItemChange = (index: number, field: "desc" | "qty", value: string) => {
    const updated = packingItems.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setPackingItems(updated);
  };

  const handleGenerateLabel = async () => {
    if (!receiverName.trim() || !receiverAddress.trim()) return;

    setIsGenerating(true);
    try {
      const { jsPDF } = (window as any).jspdf;
      // Setup document 100mm x 150mm (jsPDF swaps dimensions automatically for landscape orientation)
      const doc = new jsPDF({ orientation: orientation, unit: "mm", format: [100, 150] });
      const margin = 10;
      const paperWidth = orientation === "p" ? 100 : 150;
      const paperHeight = orientation === "p" ? 150 : 100;

      if (orientation === "p") {
        let y = 15;
        const wrapWidth = paperWidth - margin * 2;

        if (showFrom) {
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text("FROM", margin, y);
          y += 5;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(0);
          doc.text(senderName.toUpperCase(), margin, y);
          y += 4;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          const fAddr = doc.splitTextToSize(senderAddress.toUpperCase(), wrapWidth);
          doc.text(fAddr, margin, y);
          y += fAddr.length * 4 + 2;

          doc.setLineWidth(0.5);
          doc.line(margin, y, paperWidth - margin, y);
          y += 12;
        } else {
          y += 10;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        const name = receiverName.toUpperCase();
        const splitName = doc.splitTextToSize(name, wrapWidth);
        doc.text(splitName, margin, y);
        y += splitName.length * 9;

        doc.setFontSize(14);
        const addr = receiverAddress;
        const splitAddr = doc.splitTextToSize(addr, wrapWidth);
        doc.text(splitAddr, margin, y);

        if (showPackingList) {
          y = 110;
          doc.setLineWidth(0.2);
          doc.setLineDashPattern([1, 1], 0);
          doc.line(margin, y, paperWidth - margin, y);
          y += 5;

          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text("PACKING LIST", margin, y);
          doc.text("QTY", paperWidth - margin, y, { align: "right" });
          y += 5;

          doc.setFont("courier", "normal");
          doc.setFontSize(8);
          doc.setTextColor(0);
          packingItems
            .filter((i) => i.desc.trim() !== "")
            .forEach((item) => {
              doc.text(item.desc.substring(0, 35), margin, y);
              doc.text(item.qty.toString(), paperWidth - margin, y, { align: "right" });
              y += 4.5;
            });
        }
      } else {
        doc.setPage(1);
        let y = 15;
        let x = 10;
        const wrapWidth = 130;

        if (showFrom) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text("FROM", x, y);
          y += 6;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text(senderName.toUpperCase(), x, y);
          y += 5;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          const fAddr = doc.splitTextToSize(senderAddress.toUpperCase(), wrapWidth);
          doc.text(fAddr, x, y);
          y += fAddr.length * 5 + 2;

          doc.setLineWidth(0.5);
          doc.line(x, y, x + wrapWidth, y);
          y += 18;
        } else {
          y += 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(30);
        const name = receiverName.toUpperCase();
        const splitName = doc.splitTextToSize(name, wrapWidth);
        doc.text(splitName, x, y);
        y += splitName.length * 12;

        doc.setFontSize(18);
        const addr = receiverAddress;
        const splitAddr = doc.splitTextToSize(addr, wrapWidth);
        doc.text(splitAddr, x, y);

        if (showPackingList) {
          y = 75;
          doc.setLineWidth(0.2);
          doc.setLineDashPattern([1, 1], 0);
          doc.line(x, y, x + wrapWidth, y);
          y += 6;

          doc.setFontSize(9);
          doc.setTextColor(150);
          doc.text("PACKING LIST", x, y);
          doc.text("QTY", x + wrapWidth, y, { align: "right" });
          y += 6;

          doc.setFont("courier", "normal");
          doc.setFontSize(10);
          doc.setTextColor(0);
          packingItems
            .filter((i) => i.desc.trim() !== "")
            .forEach((item) => {
              doc.text(item.desc.substring(0, 50), x, y);
              doc.text(item.qty.toString(), x + wrapWidth, y, { align: "right" });
              y += 5.5;
            });
        }
      }

      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");
      showToast("Delivery label generated in a new tab!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to compile label: " + err.message, "error");
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
            Loading label processor libraries...
          </span>
        </div>
      </div>
    );
  }

  const isFormValid = receiverName.trim() !== "" && receiverAddress.trim() !== "";

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative">
      <div className="content-body flex-1 w-full overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 h-full items-stretch">
        
        {/* Left Side - Settings & Form inputs */}
        <div className="lg:col-span-7 flex flex-col h-full overflow-hidden w-full">
          
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto pr-1 pb-4 flex flex-col gap-5 custom-scrollbar">
            
            {/* Receiver Inputs */}
            <div className="bg-white border border-zinc-300/50 rounded-lg p-5 flex flex-col gap-4 shadow-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                  Receiver Name
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Enter name"
                  className="h-10 w-full px-4 border border-zinc-300 rounded-lg font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-[#EEEEEE]/10"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                  Delivery Address
                </label>
                <textarea
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  placeholder="Delivery address details..."
                  rows={3}
                  className="w-full p-4 border border-zinc-300 rounded-lg font-medium text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-[#EEEEEE]/10 resize-none leading-normal"
                />
              </div>
            </div>

            {/* Sender Options & Sender edit */}
            <div className="bg-white border border-zinc-300/50 rounded-lg p-5 flex flex-col gap-4 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showFrom}
                    onChange={(e) => setShowFrom(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-400 h-4 w-4 accent-zinc-800"
                  />
                  <span className="text-xs font-bold text-zinc-700">Display Sender Details</span>
                </label>

                {showFrom && (
                  <button
                    type="button"
                    onClick={() => setEditSender(!editSender)}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    {editSender ? "Hide Sender Info" : "Edit Sender Info"}
                  </button>
                )}
              </div>

              {showFrom && editSender && (
                <div className="border-t border-zinc-200 pt-4 flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Sender Name"
                      className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-[#EEEEEE]/10"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      Sender Address
                    </label>
                    <textarea
                      value={senderAddress}
                      onChange={(e) => setSenderAddress(e.target.value)}
                      placeholder="Sender Address"
                      rows={2}
                      className="w-full p-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-[#EEEEEE]/10 resize-none leading-normal"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-zinc-100 pt-4 flex items-center">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPackingList}
                    onChange={(e) => setShowPackingList(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-400 h-4 w-4 accent-zinc-800"
                  />
                  <span className="text-xs font-bold text-zinc-700">Display Packing List</span>
                </label>
              </div>

              {showPackingList && (
                <div className="border-t border-zinc-200 pt-4 flex flex-col gap-3 animate-fade-in">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                    Packing List Items (Max 7)
                  </span>

                  <div className="flex flex-col gap-2">
                    {packingItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.desc}
                          onChange={(e) => handleItemChange(idx, "desc", e.target.value)}
                          className="h-8 flex-1 px-3 border border-zinc-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                          className="h-8 w-20 px-2 border border-zinc-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <CustomButton
                    variant="secondary"
                    onClick={handleAddItem}
                    disabled={packingItems.length >= 7}
                    className="h-8 w-full border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Packing Item
                  </CustomButton>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger - Pinned to bottom */}
          <div className="pt-4 border-t border-slate-200/60 flex-shrink-0">
            <CustomButton
              onClick={handleGenerateLabel}
              variant="dark"
              disabled={!isFormValid || isGenerating}
              className="w-full h-10 text-xs font-bold uppercase tracking-wider shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Label...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Label
                </>
              )}
            </CustomButton>
          </div>
        </div>

        {/* Right Side - Real time Preview sticker */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start w-full py-2">
          
          {/* Orientation Selector (Centered, not full-width) */}
          <div className="w-[240px] bg-slate-100 border border-slate-200/80 rounded-lg p-0.5 flex mb-5 select-none flex-shrink-0">
            <button
              type="button"
              onClick={() => setOrientation("p")}
              className={`flex-1 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                orientation === "p"
                  ? "bg-white text-zinc-950 shadow-xs border border-slate-200/80"
                  : "text-zinc-500 hover:text-zinc-800 hover:bg-slate-200/40"
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setOrientation("l")}
              className={`flex-1 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                orientation === "l"
                  ? "bg-white text-zinc-950 shadow-xs border border-slate-200/80"
                  : "text-zinc-500 hover:text-zinc-800 hover:bg-slate-200/40"
              }`}
            >
              Landscape
            </button>
          </div>

          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Real-Time Sticker Preview
          </span>

          <div
            className={`relative bg-white border-2 border-zinc-950 shadow-md overflow-hidden select-none transition-all duration-300 ${
              orientation === "l" ? "w-[450px] h-[300px]" : "w-[300px] h-[450px]"
            }`}
          >
            <div className="p-6 w-full h-full flex flex-col">
              {/* FROM Section */}
              {showFrom && (
                <div className="border-b border-zinc-950 pb-2.5 mb-4 text-left">
                  <p className="text-[6.5px] font-black text-zinc-400 uppercase tracking-wider mb-0.5">
                    From
                  </p>
                  <p className="text-[9px] font-bold text-zinc-900 leading-tight truncate uppercase">
                    {senderName || "SENDER NAME"}
                  </p>
                  <p className="text-[7.5px] text-zinc-600 leading-snug uppercase mt-0.5 max-h-12 overflow-hidden">
                    {senderAddress || "Sender address will appear here"}
                  </p>
                </div>
              )}

              {/* TO Section */}
              <div className="flex-1 text-left flex flex-col justify-start">
                <p className="text-[6.5px] font-black text-zinc-400 uppercase tracking-wider mb-1">
                  Deliver To
                </p>
                <h2 className="text-lg font-black text-zinc-950 leading-tight uppercase tracking-tight break-all mb-2">
                  {receiverName || "RECEIVER NAME"}
                </h2>
                <p className="text-xs font-bold text-zinc-800 leading-snug whitespace-pre-wrap max-h-36 overflow-hidden">
                  {receiverAddress || "Delivery destination will appear here..."}
                </p>
              </div>

              {/* Packing list Section */}
              {showPackingList && packingItems.some((i) => i.desc.trim() !== "") && (
                <div className="mt-4 pt-3.5 border-t border-dashed border-zinc-300 text-left">
                  <div className="flex justify-between items-center mb-1 text-[6.5px] font-black text-zinc-400 uppercase tracking-wider">
                    <span>Packing List</span>
                    <span>Qty</span>
                  </div>
                  <div className="flex flex-col gap-0.5 max-h-24 overflow-hidden">
                    {packingItems
                      .filter((i) => i.desc.trim() !== "")
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-[8px] font-mono leading-none border-b border-zinc-50 pb-0.5"
                        >
                          <span className="truncate max-w-[80%]">• {item.desc}</span>
                          <span className="font-bold">{item.qty}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Footer Section */}
              <div className="mt-auto pt-3 flex justify-between items-center opacity-30 border-t border-zinc-100">
                <span className="text-xs font-extrabold tracking-tighter text-zinc-900">
                  HSG Global
                </span>
                <span className="bg-zinc-200 px-1.5 py-0.5 rounded text-[6px] font-bold uppercase tracking-wider">
                  Sticker 100x150
                </span>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
