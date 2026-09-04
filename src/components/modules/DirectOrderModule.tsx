"use client";

import * as React from "react";
import { showToast } from "@/lib/toast";
import { 
  Printer, 
  Check, 
  RefreshCw
} from "lucide-react";

interface DirectOrderModuleProps {
  profile?: any;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

export function DirectOrderModule({ profile }: DirectOrderModuleProps) {
  const [activeOrderTab, setActiveOrderTab] = React.useState<"orders" | "quotes">("orders");
  const [orders, setOrders] = React.useState<any[]>([]);
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);

  // Complete modal state
  const [completingItem, setCompletingItem] = React.useState<any | null>(null);
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [invoiceAmount, setInvoiceAmount] = React.useState("");
  const [savingCompletion, setSavingCompletion] = React.useState(false);

  // Load orders and quotes
  const loadData = React.useCallback(async () => {
    setFetching(true);
    try {
      // 1. Fetch Orders
      const orderRes = await fetch(`${WORKER_URL}/api/directorder/orders`);
      if (orderRes.ok) {
        const json = await orderRes.json();
        const list = Array.isArray(json) ? json : [];
        
        // Sort by created_at desc
        const sorted = list.sort((a: any, b: any) => Number(b.created_at || 0) - Number(a.created_at || 0));
        
        const mapped = sorted.map((o: any) => {
          let itemsText = "";
          try {
            const parsedItems = typeof o.items === "string" ? JSON.parse(o.items) : o.items;
            if (Array.isArray(parsedItems)) {
              itemsText = parsedItems.map((it: any) => `${it.sku} x${it.qty || it.carton_qty}`).join(", ");
            }
          } catch (e) {
            itemsText = String(o.items);
          }

          const storeSuffix = o.store_id ? ` (${o.store_id})` : "";
          const retailerDisplayName = `${o.retailer_name || o.retailer_id || "Retailer"}${storeSuffix}`;

          return {
            ...o,
            created_at_label: o.created_at ? new Date(Number(o.created_at)).toLocaleDateString("en-GB") : "-",
            items_label: itemsText,
            retailer_display: retailerDisplayName,
            invoice_amount_label: o.invoice_amount !== null && o.invoice_amount !== undefined ? `$${Number(o.invoice_amount).toFixed(2)}` : "-"
          };
        });
        setOrders(mapped);
      }

      // 2. Fetch Quotes
      const quoteRes = await fetch(`${WORKER_URL}/api/directorder/quotes`);
      if (quoteRes.ok) {
        const json = await quoteRes.json();
        const list = Array.isArray(json) ? json : [];
        
        // Sort by created_at desc
        const sorted = list.sort((a: any, b: any) => Number(b.created_at || 0) - Number(a.created_at || 0));

        const mapped = sorted.map((q: any) => {
          let itemsText = "";
          try {
            const parsedItems = typeof q.items === "string" ? JSON.parse(q.items) : q.items;
            if (Array.isArray(parsedItems)) {
              itemsText = parsedItems.map((it: any) => `${it.sku} x${it.qty || it.carton_qty}`).join(", ");
            }
          } catch (e) {
            itemsText = String(q.items);
          }

          return {
            ...q,
            created_at_label: q.created_at ? new Date(Number(q.created_at)).toLocaleDateString("en-GB") : "-",
            items_label: itemsText,
            invoice_amount_label: q.invoice_amount !== null && q.invoice_amount !== undefined ? `$${Number(q.invoice_amount).toFixed(2)}` : "-"
          };
        });
        setQuotes(mapped);
      }
    } catch (err: any) {
      showToast("Failed to load records: " + err.message, "error");
    } finally {
      setFetching(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle global refresh integration
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await loadData();
      showToast("All direct order data refreshed!", "success");
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadData]);

  // Open completeness popup
  const openCompleteModal = (item: any) => {
    setCompletingItem(item);
    setInvoiceNumber(item.invoice_number || "");
    setInvoiceAmount(item.invoice_amount ? String(item.invoice_amount) : "");
  };

  // Submit complete order/quote status
  const handleSaveCompletion = async () => {
    if (!invoiceNumber.trim()) {
      showToast("Invoice Number is required", "warning");
      return;
    }
    if (!invoiceAmount.trim() || isNaN(Number(invoiceAmount))) {
      showToast("Valid Invoice Amount is required", "warning");
      return;
    }

    setSavingCompletion(true);
    const isQuote = completingItem.id.startsWith("QU-");

    try {
      const res = await fetch(`${WORKER_URL}/api/directorder/${isQuote ? "quotes" : "orders"}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: completingItem.id,
            status: "complete",
            invoice_number: invoiceNumber.trim(),
            invoice_amount: parseFloat(invoiceAmount)
          }
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update failed");

      showToast(`Record ${completingItem.id} updated to complete!`, "success");
      setCompletingItem(null);
      loadData();
    } catch (err: any) {
      showToast("Failed to complete record: " + err.message, "error");
    } finally {
      setSavingCompletion(false);
    }
  };

  const handlePrint = (row: any) => {
    const isQuote = row.id.startsWith("QU-");
    const paramKey = isQuote ? "quoteId" : "orderId";
    window.open(`https://order.hsgglobal.sg/?${paramKey}=${row.id}`, "_blank");
  };

  const orderColumns = [
    { id: "id", header: "Order ID" },
    { id: "created_at_label", header: "Date" },
    { id: "retailer_display", header: "Retailer (Store ID)" },
    { id: "address", header: "Delivery Address" },
    { id: "items_label", header: "Items Ordered" },
    { id: "status", header: "Status" },
    { id: "invoice_number", header: "Invoice No." },
    { id: "invoice_amount_label", header: "Amount" },
  ];

  const quoteColumns = [
    { id: "id", header: "Quote ID" },
    { id: "created_at_label", header: "Date" },
    { id: "customer_name", header: "Customer Name" },
    { id: "customer_phone", header: "Phone Number" },
    { id: "customer_email", header: "Email Address" },
    { id: "address", header: "Address" },
    { id: "items_label", header: "Items Quoted" },
    { id: "status", header: "Status" },
    { id: "invoice_number", header: "Invoice No." },
    { id: "invoice_amount_label", header: "Amount" },
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Direct Orders & Quotes</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Manage direct retail store orders and customer quotations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={fetching}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin text-[#0B57D0]" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Filter & Controls Toolbar */}
      <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <button
            onClick={() => setActiveOrderTab("orders")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeOrderTab === "orders" 
                ? "bg-[#0B57D0] text-white shadow-xs" 
                : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-50"
            }`}
          >
            Direct Retail Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveOrderTab("quotes")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeOrderTab === "quotes" 
                ? "bg-[#0B57D0] text-white shadow-xs" 
                : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-50"
            }`}
          >
            Customer Quotations ({quotes.length})
          </button>
        </div>
      </div>

      {/* 3. Main Content Viewport */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeOrderTab === "orders" ? (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="overflow-auto flex-1">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    {orderColumns.map((c) => (
                      <th key={c.id} className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">
                        {c.header}
                      </th>
                    ))}
                    <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[120px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {fetching && orders.length === 0 ? (
                    <tr>
                      <td colSpan={orderColumns.length + 1} className="px-3 py-8 text-center text-zinc-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                          <span>Loading orders...</span>
                        </div>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={orderColumns.length + 1} className="px-3 py-8 text-center text-zinc-400 italic">
                        No direct retail orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-bold text-zinc-900">{o.id}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-500 font-medium">{o.created_at_label}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-zinc-800">{o.retailer_display}</td>
                        <td className="px-3.5 py-2.5 text-zinc-650">{o.address} ({o.postcode})</td>
                        <td className="px-3.5 py-2.5 text-zinc-650 max-w-[200px] truncate" title={o.items_label}>
                          {o.items_label}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {(() => {
                            const s = String(o.status || "pending").toLowerCase();
                            let bg = "bg-amber-50 text-amber-700 border-amber-200";
                            let label = String(o.status || "PENDING").toUpperCase();

                            if (s === "complete") {
                              bg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                              label = "COMPLETE";
                            } else if (s === "delivered") {
                              bg = "bg-teal-50 text-teal-700 border-teal-200";
                              label = "DELIVERED";
                            } else if (s === "out for delivery" || s === "load" || s === "in transit") {
                              bg = "bg-blue-50 text-blue-700 border-blue-200";
                              label = s === "load" ? "LOADED" : "OUT FOR DELIVERY";
                            } else if (s === "picking" || s === "ready to pick" || s === "ready to deliver") {
                              bg = "bg-purple-50 text-purple-700 border-purple-200";
                              label = s.toUpperCase();
                            }

                            return (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bg}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-650 font-medium">{o.invoice_number || "-"}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-bold text-zinc-900">{o.invoice_amount_label}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => handlePrint(o)}
                              className="p-1.5 text-zinc-600 hover:text-zinc-950 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition-colors shadow-xs"
                              title="Print Summary Page"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {o.status !== "complete" && (
                              <button
                                onClick={() => openCompleteModal(o)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-50 cursor-pointer transition-colors shadow-xs"
                                title="Mark Complete"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="overflow-auto flex-1">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    {quoteColumns.map((c) => (
                      <th key={c.id} className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">
                        {c.header}
                      </th>
                    ))}
                    <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[120px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {fetching && quotes.length === 0 ? (
                    <tr>
                      <td colSpan={quoteColumns.length + 1} className="px-3 py-8 text-center text-zinc-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                          <span>Loading quotations...</span>
                        </div>
                      </td>
                    </tr>
                  ) : quotes.length === 0 ? (
                    <tr>
                      <td colSpan={quoteColumns.length + 1} className="px-3 py-8 text-center text-zinc-400 italic">
                        No customer quotations found.
                      </td>
                    </tr>
                  ) : (
                    quotes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-bold text-zinc-900">{q.id}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-500 font-medium">{q.created_at_label}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-zinc-800">{q.customer_name}</td>
                        <td className="px-3.5 py-2.5 text-zinc-650">{q.customer_phone}</td>
                        <td className="px-3.5 py-2.5 text-zinc-650">{q.customer_email}</td>
                        <td className="px-3.5 py-2.5 text-zinc-650">{q.address} ({q.postcode})</td>
                        <td className="px-3.5 py-2.5 text-zinc-650 max-w-[200px] truncate" title={q.items_label}>
                          {q.items_label}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              q.status === "complete" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {q.status === "complete" ? "COMPLETE" : "PENDING"}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-650 font-medium">{q.invoice_number || "-"}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-bold text-zinc-900">{q.invoice_amount_label}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => handlePrint(q)}
                              className="p-1.5 text-zinc-600 hover:text-zinc-950 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition-colors shadow-xs"
                              title="Print Summary Page"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {q.status !== "complete" && (
                              <button
                                onClick={() => openCompleteModal(q)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-50 cursor-pointer transition-colors shadow-xs"
                                title="Mark Complete"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Completion Dialog Overlay */}
      {completingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-[450px] w-full flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-zinc-950 uppercase tracking-wider">Set Record Complete</h3>
              <p className="text-xs text-zinc-500">Provide final billing invoice details for {completingItem.id}.</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Invoice Number:</label>
                <input
                  type="text"
                  className="bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 outline-none focus:border-[#0B57D0] text-xs text-zinc-900 font-semibold"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV2026-908"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Invoice Amount ($):</label>
                <input
                  type="text"
                  className="bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 outline-none focus:border-[#0B57D0] text-xs text-zinc-900 font-semibold"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="e.g. 520.50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setCompletingItem(null)}
                disabled={savingCompletion}
                className="px-4 py-2 border border-slate-200 bg-white text-zinc-700 font-bold rounded hover:bg-slate-50 text-xs transition-colors cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompletion}
                disabled={savingCompletion}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded disabled:opacity-50 text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {savingCompletion ? "Saving..." : "Set Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
