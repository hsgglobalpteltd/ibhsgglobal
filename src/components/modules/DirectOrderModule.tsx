"use client";

import * as React from "react";
import { showToast } from "@/lib/toast";
import { 
  Printer, 
  Check, 
  RefreshCw,
  Package,
  X
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

  // Items popup modal state
  const [viewingItemsRow, setViewingItemsRow] = React.useState<any | null>(null);

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
          let parsedItemsList: any[] = [];
          try {
            const parsedItems = typeof o.items === "string" ? JSON.parse(o.items) : o.items;
            if (Array.isArray(parsedItems)) {
              parsedItemsList = parsedItems;
            }
          } catch (e) {
            parsedItemsList = [];
          }

          const retailerDisplayName = o.retailer_name || o.store_name || o.retailer_id || "-";

          return {
            ...o,
            parsed_items: parsedItemsList,
            items_count: parsedItemsList.reduce((acc, it) => acc + (Number(it.qty || it.carton_qty) || 1), 0),
            created_at_label: o.created_at ? new Date(Number(o.created_at)).toLocaleDateString("en-GB") : "-",
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
          let parsedItemsList: any[] = [];
          try {
            const parsedItems = typeof q.items === "string" ? JSON.parse(q.items) : q.items;
            if (Array.isArray(parsedItems)) {
              parsedItemsList = parsedItems;
            }
          } catch (e) {
            parsedItemsList = [];
          }

          return {
            ...q,
            parsed_items: parsedItemsList,
            items_count: parsedItemsList.reduce((acc, it) => acc + (Number(it.qty || it.carton_qty) || 1), 0),
            created_at_label: q.created_at ? new Date(Number(q.created_at)).toLocaleDateString("en-GB") : "-",
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
    { id: "retailer_display", header: "Retailer / Store" },
    { id: "address", header: "Delivery Address" },
    { id: "items", header: "Items" },
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
    { id: "items", header: "Items" },
    { id: "status", header: "Status" },
    { id: "invoice_number", header: "Invoice No." },
    { id: "invoice_amount_label", header: "Amount" },
  ];

  const renderStatusBadge = (status: string) => {
    const s = String(status || "pending").toLowerCase();
    if (s === "complete") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Complete
        </span>
      );
    }
    if (s === "delivered") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
          Delivered
        </span>
      );
    }
    if (s === "out for delivery" || s === "load" || s === "in transit") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          {s === "load" ? "Loaded" : "Out for Delivery"}
        </span>
      );
    }
    if (s === "picking" || s === "ready to pick" || s === "ready to deliver") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
          {s === "ready to pick" ? "Ready to Pick" : s === "ready to deliver" ? "Ready to Deliver" : "Picking"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        Pending
      </span>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. Top Header Bar with Segmented View Tabs */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Direct Orders & Quotes</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Manage direct retail store orders and customer quotations.</p>
        </div>
        
        {/* Navigation Tabs (No QTY inside) */}
        <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
          <button
            onClick={() => setActiveOrderTab("orders")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeOrderTab === "orders" 
                ? "bg-white text-[#0B57D0] shadow-xs" 
                : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-200/50"
            }`}
          >
            Retailer Orders
          </button>
          <button
            onClick={() => setActiveOrderTab("quotes")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeOrderTab === "quotes" 
                ? "bg-white text-[#0B57D0] shadow-xs" 
                : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-200/50"
            }`}
          >
            Customer Quotations
          </button>
        </div>
      </div>

      {/* 2. Main Content Viewport */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeOrderTab === "orders" ? (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="overflow-auto flex-1">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    {orderColumns.map((c) => (
                      <th key={c.id} className="px-3.5 py-2.5 text-left font-semibold text-zinc-600 text-xs">
                        {c.header}
                      </th>
                    ))}
                    <th className="px-3.5 py-2.5 text-center font-semibold text-zinc-600 text-xs w-[100px]">
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
                      <td colSpan={orderColumns.length + 1} className="px-3 py-8 text-center text-zinc-400">
                        No direct retail orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-zinc-900">{o.id}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-500">{o.created_at_label}</td>
                        <td className="px-3.5 py-2.5 text-zinc-800 font-medium">{o.retailer_display}</td>
                        <td className="px-3.5 py-2.5 text-zinc-600">{o.address ? `${o.address}${o.postcode ? ` (${o.postcode})` : ""}` : "-"}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <button
                            onClick={() => setViewingItemsRow({ id: o.id, items: o.parsed_items, title: `Order ${o.id} Items` })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-[#0B57D0] transition-colors shadow-2xs cursor-pointer"
                          >
                            <Package className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{o.parsed_items.length} {o.parsed_items.length === 1 ? "Item" : "Items"}</span>
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {renderStatusBadge(o.status)}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-600 font-mono text-[11px]">{o.invoice_number || "-"}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold text-zinc-900">{o.invoice_amount_label}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrint(o)}
                              className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-950 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                              title="Print Summary Page"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {o.status !== "complete" ? (
                              <button
                                onClick={() => openCompleteModal(o)}
                                className="w-7 h-7 flex items-center justify-center text-emerald-600 hover:text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-50 cursor-pointer transition-colors shadow-2xs"
                                title="Mark Complete"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="w-7 h-7" />
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
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    {quoteColumns.map((c) => (
                      <th key={c.id} className="px-3.5 py-2.5 text-left font-semibold text-zinc-600 text-xs">
                        {c.header}
                      </th>
                    ))}
                    <th className="px-3.5 py-2.5 text-center font-semibold text-zinc-600 text-xs w-[100px]">
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
                      <td colSpan={quoteColumns.length + 1} className="px-3 py-8 text-center text-zinc-400">
                        No customer quotations found.
                      </td>
                    </tr>
                  ) : (
                    quotes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-zinc-900">{q.id}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-500">{q.created_at_label}</td>
                        <td className="px-3.5 py-2.5 font-medium text-zinc-800">{q.customer_name || "-"}</td>
                        <td className="px-3.5 py-2.5 text-zinc-600">{q.customer_phone || "-"}</td>
                        <td className="px-3.5 py-2.5 text-zinc-600">{q.customer_email || "-"}</td>
                        <td className="px-3.5 py-2.5 text-zinc-600">{q.address ? `${q.address}${q.postcode ? ` (${q.postcode})` : ""}` : "-"}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <button
                            onClick={() => setViewingItemsRow({ id: q.id, items: q.parsed_items, title: `Quote ${q.id} Items` })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-[#0B57D0] transition-colors shadow-2xs cursor-pointer"
                          >
                            <Package className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{q.parsed_items.length} {q.parsed_items.length === 1 ? "Item" : "Items"}</span>
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {renderStatusBadge(q.status)}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-zinc-600 font-mono text-[11px]">{q.invoice_number || "-"}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold text-zinc-900">{q.invoice_amount_label}</td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrint(q)}
                              className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-950 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                              title="Print Summary Page"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {q.status !== "complete" ? (
                              <button
                                onClick={() => openCompleteModal(q)}
                                className="w-7 h-7 flex items-center justify-center text-emerald-600 hover:text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-50 cursor-pointer transition-colors shadow-2xs"
                                title="Mark Complete"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="w-7 h-7" />
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

      {/* 3. Items List Modal */}
      {viewingItemsRow && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[0.5px] flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-[480px] w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">{viewingItemsRow.title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">List of requested items and quantities</p>
              </div>
              <button
                onClick={() => setViewingItemsRow(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {viewingItemsRow.items && viewingItemsRow.items.length > 0 ? (
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-zinc-500 font-semibold text-[11px]">
                      <th className="pb-2 text-left">SKU / Item</th>
                      <th className="pb-2 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingItemsRow.items.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 text-zinc-800 font-medium">{it.sku || it.name || "Item"}</td>
                        <td className="py-2 text-right text-zinc-900 font-semibold">{it.qty || it.carton_qty || 1} {it.carton_qty ? "ctn" : "pcs"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-zinc-400 text-xs">No items detailed.</div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingItemsRow(null)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-zinc-700 font-medium text-xs rounded transition-colors shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Completion Dialog Overlay */}
      {completingItem && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[0.5px] flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-[420px] w-full flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-bold text-zinc-950">Set Record Complete</h3>
              <p className="text-xs text-zinc-500">Provide final billing invoice details for {completingItem.id}.</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Invoice Number</label>
                <input
                  type="text"
                  className="bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] text-xs text-zinc-900"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV2026-908"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Invoice Amount ($)</label>
                <input
                  type="text"
                  className="bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] text-xs text-zinc-900"
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
                className="px-3.5 py-1.5 border border-slate-200 bg-white text-zinc-700 font-medium rounded-md hover:bg-slate-50 text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompletion}
                disabled={savingCompletion}
                className="px-3.5 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-medium rounded-md disabled:opacity-50 text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
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

