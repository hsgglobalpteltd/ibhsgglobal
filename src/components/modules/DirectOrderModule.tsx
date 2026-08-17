"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { 
  Printer, 
  Check, 
  Settings, 
  Save, 
  RefreshCw, 
  Upload, 
  X, 
  Edit, 
  Image as ImageIcon, 
  Search, 
  Plus, 
  Trash2,
  Sliders,
  List,
  Mail
} from "lucide-react";

interface DirectOrderModuleProps {
  profile?: any;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

export function DirectOrderModule({ profile }: DirectOrderModuleProps) {
  // Main tabs: Order, Catalog, Setting
  const [activeMainTab, setActiveMainTab] = React.useState<"order" | "catalog" | "setting">("order");
  
  // Order tab specific state (retaining orders/quotes)
  const [activeOrderTab, setActiveOrderTab] = React.useState<"orders" | "quotes">("orders");
  const [orders, setOrders] = React.useState<any[]>([]);
  const [quotes, setQuotes] = React.useState<any[]>([]);
  
  // Catalog tab specific state
  const [products, setProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = React.useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = React.useState("");
  const [editingProduct, setEditingProduct] = React.useState<any | null>(null);
  
  const [fetching, setFetching] = React.useState(false);
  
  // WhatsApp settings
  const [whatsappNumber, setWhatsappNumber] = React.useState("+6583494429");

  // Email & Automation settings
  const [adminEmail, setAdminEmail] = React.useState("sales@hsgglobal.sg");
  const [ccEmail1, setCcEmail1] = React.useState("");
  const [ccEmail2, setCcEmail2] = React.useState("");
  const [ccEmail3, setCcEmail3] = React.useState("");
  const [toggleSendEmailBuyer, setToggleSendEmailBuyer] = React.useState(true);
  const [toggleReminderOrder, setToggleReminderOrder] = React.useState(true);
  const [toggleOrderSubmissionReceived, setToggleOrderSubmissionReceived] = React.useState(true);
  const [toggleUpdateOrder, setToggleUpdateOrder] = React.useState(true);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [triggeringReminder, setTriggeringReminder] = React.useState(false);
  const [testingTemplate, setTestingTemplate] = React.useState<string | null>(null);

  // Complete modal state
  const [completingItem, setCompletingItem] = React.useState<any | null>(null);
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [invoiceAmount, setInvoiceAmount] = React.useState("");
  const [savingCompletion, setSavingCompletion] = React.useState(false);

  // Load settings
  const loadSettings = React.useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/api/directorder/settings`);
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : [];
        
        const waRec = list.find((s: any) => s.key === "receiver_order_whatsapp");
        if (waRec && waRec.value) setWhatsappNumber(waRec.value);

        const emailRec = list.find((s: any) => s.key === "receiver_order_email");
        if (emailRec && emailRec.value) setAdminEmail(emailRec.value);

        const cc1Rec = list.find((s: any) => s.key === "receiver_order_cc_1");
        if (cc1Rec && cc1Rec.value) setCcEmail1(cc1Rec.value);

        const cc2Rec = list.find((s: any) => s.key === "receiver_order_cc_2");
        if (cc2Rec && cc2Rec.value) setCcEmail2(cc2Rec.value);

        const cc3Rec = list.find((s: any) => s.key === "receiver_order_cc_3");
        if (cc3Rec && cc3Rec.value) setCcEmail3(cc3Rec.value);

        const buyerRec = list.find((s: any) => s.key === "toggle_send_email_buyer");
        if (buyerRec) setToggleSendEmailBuyer(buyerRec.value === "true");

        const reminderRec = list.find((s: any) => s.key === "toggle_reminder_order");
        if (reminderRec) setToggleReminderOrder(reminderRec.value === "true");

        const receivedRec = list.find((s: any) => s.key === "toggle_order_submission_received");
        if (receivedRec) setToggleOrderSubmissionReceived(receivedRec.value === "true");

        const updateRec = list.find((s: any) => s.key === "toggle_update_order");
        if (updateRec) setToggleUpdateOrder(updateRec.value === "true");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, []);

  // Save Notification & Automation settings
  const handleSaveSettings = async () => {
    if (!whatsappNumber.trim()) {
      showToast("WhatsApp phone number is required", "warning");
      return;
    }
    setSavingSettings(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/directorder/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            { key: "receiver_order_whatsapp", value: whatsappNumber.trim() },
            { key: "receiver_order_email", value: adminEmail.trim() },
            { key: "receiver_order_cc_1", value: ccEmail1.trim() },
            { key: "receiver_order_cc_2", value: ccEmail2.trim() },
            { key: "receiver_order_cc_3", value: ccEmail3.trim() },
            { key: "toggle_send_email_buyer", value: String(toggleSendEmailBuyer) },
            { key: "toggle_reminder_order", value: String(toggleReminderOrder) },
            { key: "toggle_order_submission_received", value: String(toggleOrderSubmissionReceived) },
            { key: "toggle_update_order", value: String(toggleUpdateOrder) }
          ]
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Save failed");

      showToast("Notification and automation settings updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to save settings: " + err.message, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // Trigger manual reminder
  const handleTriggerReminder = async () => {
    setTriggeringReminder(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/public/order/trigger-reminder`, {
        method: "POST"
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Trigger failed");
      showToast(`Reminder run completed! Processed: ${result.processed || 0} reminders.`, "success");
    } catch (err: any) {
      showToast("Failed to trigger reminder: " + err.message, "error");
    } finally {
      setTriggeringReminder(false);
    }
  };

  // Send test template email
  const handleTestTemplate = async (templateType: string) => {
    if (!adminEmail.trim()) {
      showToast("Please input Sales Admin Email first", "warning");
      return;
    }
    setTestingTemplate(templateType);
    try {
      const res = await fetch(`${WORKER_URL}/api/public/order/test-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType,
          adminEmail: adminEmail.trim()
        })
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send test email");
      showToast(`Test email sent to ${adminEmail}`, "success");
    } catch (err: any) {
      showToast("Test failed: " + err.message, "error");
    } finally {
      setTestingTemplate(null);
    }
  };

  // Load orders, quotes, products, brands
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

      // 3. Fetch Products
      const prodRes = await fetch(`${WORKER_URL}/api/directorder/products`);
      if (prodRes.ok) {
        const json = await prodRes.json();
        const list = Array.isArray(json) ? json : [];
        setProducts(list);
      }

      // 4. Fetch Brands
      const brandRes = await fetch(`${WORKER_URL}/api/directorder/brands`);
      if (brandRes.ok) {
        const json = await brandRes.json();
        const list = Array.isArray(json) ? json : [];
        const sortedBrands = list.sort((a: any, b: any) => Number(a.rank || 9999) - Number(b.rank || 9999));
        setBrands(sortedBrands);
        if (sortedBrands.length > 0 && !selectedBrandId) {
          setSelectedBrandId(sortedBrands[0].id);
        }
      }
    } catch (err: any) {
      showToast("Failed to load records: " + err.message, "error");
    } finally {
      setFetching(false);
    }
  }, [selectedBrandId]);

  React.useEffect(() => {
    loadSettings();
    loadData();
  }, [loadSettings, loadData]);

  // Handle global refresh integration
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await loadData();
      showToast("All data successfully refreshed!", "success");
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadData]);

  // Toggle "Display in Catalog" visibility
  const handleToggleCatalog = async (product: any, currentValue: boolean) => {
    const nextValue = !currentValue;
    
    // Optimistic Update
    const previousProducts = [...products];
    setProducts(prev => prev.map(p => p.sku === product.sku ? { ...p, list_in_catalog: nextValue } : p));
    
    try {
      const res = await fetch(`${WORKER_URL}/api/directorder/catalog/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            sku: product.sku,
            list_in_catalog: nextValue
          }
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Save failed");

      showToast(`Visibility updated for ${product.display_name || product.sku}`, "success");
      // Silently sync background cache
      loadData();
    } catch (err: any) {
      showToast("Failed to update catalog visibility: " + err.message, "error");
      setProducts(previousProducts);
    }
  };

  // Save product metadata edits
  const handleSaveProductMeta = async (updatedProduct: any) => {
    const previousProducts = [...products];
    setProducts(prev => prev.map(p => p.sku === updatedProduct.sku ? updatedProduct : p));
    setEditingProduct(null);

    try {
      const res = await fetch(`${WORKER_URL}/api/directorder/catalog/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            sku: updatedProduct.sku,
            image: updatedProduct.image,
            product_meta: updatedProduct.product_meta
          }
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update failed");

      showToast(`Catalog metadata saved successfully!`, "success");
      loadData();
    } catch (err: any) {
      showToast("Failed to save product changes: " + err.message, "error");
      setProducts(previousProducts);
    }
  };

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
    const targetTable = isQuote ? "direct_quotes" : "direct_orders";

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

  // Brand lookup mapping
  const getBrandName = (brandId: string) => {
    const b = brands.find((br) => br.id === brandId);
    return b ? b.display_name : brandId;
  };

  // Brand-wise product counts
  const getProductCountForBrand = (brandId: string) => {
    return products.filter(p => p.brands_id === brandId).length;
  };

  // Filtered products for Catalog view
  const filteredProducts = React.useMemo(() => {
    let result = products;
    if (selectedBrandId) {
      result = result.filter(p => p.brands_id === selectedBrandId);
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase().trim();
      result = result.filter(p => 
        (p.sku || "").toLowerCase().includes(q) || 
        (p.display_name || "").toLowerCase().includes(q) ||
        (p.product_meta?.Title || "").toLowerCase().includes(q) ||
        (p.product_meta?.Short_Title || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, selectedBrandId, catalogSearch]);

  const orderColumns: Column[] = [
    { id: "id", header: "Order ID", accessor: "id" },
    { id: "created_at_label", header: "Date", accessor: "created_at_label" },
    { id: "retailer_display", header: "Retailer (Store ID)", accessor: "retailer_display" },
    { id: "address", header: "Delivery Address", accessor: "address" },
    { id: "items_label", header: "Items Ordered", accessor: "items_label" },
    { id: "status", header: "Status", accessor: "status" },
    { id: "invoice_number", header: "Invoice No.", accessor: "invoice_number" },
    { id: "invoice_amount_label", header: "Amount", accessor: "invoice_amount_label" },
  ];

  const quoteColumns: Column[] = [
    { id: "id", header: "Quote ID", accessor: "id" },
    { id: "created_at_label", header: "Date", accessor: "created_at_label" },
    { id: "customer_name", header: "Customer Name", accessor: "customer_name" },
    { id: "customer_phone", header: "Phone Number", accessor: "customer_phone" },
    { id: "customer_email", header: "Email Address", accessor: "customer_email" },
    { id: "address", header: "Address", accessor: "address" },
    { id: "items_label", header: "Items Quoted", accessor: "items_label" },
    { id: "status", header: "Status", accessor: "status" },
    { id: "invoice_number", header: "Invoice No.", accessor: "invoice_number" },
    { id: "invoice_amount_label", header: "Amount", accessor: "invoice_amount_label" },
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden p-2 gap-3 bg-white">
      {/* Top Header Module Layout */}
      <div className="flex flex-row justify-between items-center pb-1 border-b border-zinc-200 gap-4 flex-wrap">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-zinc-800">Direct Sales Management</h2>
          <p className="text-xs text-zinc-500">Manage direct retail orders, quotations, catalogs, and system configurations.</p>
        </div>

        {/* Global Level Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
          <button
            onClick={() => setActiveMainTab("order")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeMainTab === "order" 
                ? "bg-white text-orange-600 shadow-xs border border-zinc-200/50" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Order
          </button>
          <button
            onClick={() => setActiveMainTab("catalog")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeMainTab === "catalog" 
                ? "bg-white text-orange-600 shadow-xs border border-zinc-200/50" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveMainTab("setting")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeMainTab === "setting" 
                ? "bg-white text-orange-600 shadow-xs border border-zinc-200/50" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Setting
          </button>
        </div>
      </div>

      {/* Main Tab Render Sections */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        {activeMainTab === "order" && (
          <div className="h-full flex flex-col gap-3 min-h-0">
            {/* Sub Tabs selector for Orders/Quotes */}
            <div className="flex flex-row gap-2 border-b border-zinc-200">
              <button
                onClick={() => setActiveOrderTab("orders")}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeOrderTab === "orders" ? "border-orange-600 text-orange-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Direct Retail Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveOrderTab("quotes")}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeOrderTab === "quotes" ? "border-orange-600 text-orange-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Customer Quotations ({quotes.length})
              </button>
            </div>

            {/* Tables Area */}
            <div className="flex-1 overflow-hidden relative min-h-0">
              {activeOrderTab === "orders" ? (
                <div className="h-full flex flex-col">
                  <div className="overflow-auto flex-1 border border-zinc-200 rounded-md">
                    <table className="min-w-full divide-y divide-zinc-200 text-xs">
                      <thead className="bg-zinc-50 sticky top-0 z-10">
                        <tr>
                          {orderColumns.map((c) => (
                            <th key={c.id} className="px-3 py-2 text-left font-semibold text-zinc-600 border-b border-zinc-200">
                              {c.header}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-semibold text-zinc-600 border-b border-zinc-200 w-[120px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-zinc-200">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={orderColumns.length + 1} className="px-3 py-8 text-center text-zinc-400 italic">
                              No direct retail orders found.
                            </td>
                          </tr>
                        ) : (
                          orders.map((o) => (
                            <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-3 py-2 whitespace-nowrap font-medium text-zinc-800">{o.id}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-zinc-500">{o.created_at_label}</td>
                              <td className="px-3 py-2 font-medium text-zinc-700">{o.retailer_display}</td>
                              <td className="px-3 py-2 text-zinc-600">{o.address} ({o.postcode})</td>
                              <td className="px-3 py-2 text-zinc-600 max-w-[200px] truncate" title={o.items_label}>
                                {o.items_label}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    o.status === "complete" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {o.status === "complete" ? "COMPLETE" : "PENDING"}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{o.invoice_number || "-"}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-semibold text-zinc-800">{o.invoice_amount_label}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => handlePrint(o)}
                                    className="p-1 text-zinc-600 hover:text-zinc-950 border border-zinc-200 rounded hover:bg-zinc-50 cursor-pointer transition-colors"
                                    title="Print Summary Page"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  {o.status !== "complete" && (
                                    <button
                                      onClick={() => openCompleteModal(o)}
                                      className="p-1 text-green-600 hover:text-green-800 border border-green-200 rounded hover:bg-green-50 cursor-pointer transition-colors"
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
                <div className="h-full flex flex-col">
                  <div className="overflow-auto flex-1 border border-zinc-200 rounded-md">
                    <table className="min-w-full divide-y divide-zinc-200 text-xs">
                      <thead className="bg-zinc-50 sticky top-0 z-10">
                        <tr>
                          {quoteColumns.map((c) => (
                            <th key={c.id} className="px-3 py-2 text-left font-semibold text-zinc-600 border-b border-zinc-200">
                              {c.header}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-semibold text-zinc-600 border-b border-zinc-200 w-[120px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-zinc-200">
                        {quotes.length === 0 ? (
                          <tr>
                            <td colSpan={quoteColumns.length + 1} className="px-3 py-8 text-center text-zinc-400 italic">
                              No customer quotations found.
                            </td>
                          </tr>
                        ) : (
                          quotes.map((q) => (
                            <tr key={q.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-3 py-2 whitespace-nowrap font-medium text-zinc-800">{q.id}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-zinc-500">{q.created_at_label}</td>
                              <td className="px-3 py-2 font-medium text-zinc-700">{q.customer_name}</td>
                              <td className="px-3 py-2 text-zinc-600">{q.customer_phone}</td>
                              <td className="px-3 py-2 text-zinc-600">{q.customer_email}</td>
                              <td className="px-3 py-2 text-zinc-600">{q.address} ({q.postcode})</td>
                              <td className="px-3 py-2 text-zinc-600 max-w-[200px] truncate" title={q.items_label}>
                                {q.items_label}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    q.status === "complete" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {q.status === "complete" ? "COMPLETE" : "PENDING"}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{q.invoice_number || "-"}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-semibold text-zinc-800">{q.invoice_amount_label}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => handlePrint(q)}
                                    className="p-1 text-zinc-600 hover:text-zinc-950 border border-zinc-200 rounded hover:bg-zinc-50 cursor-pointer transition-colors"
                                    title="Print Summary Page"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  {q.status !== "complete" && (
                                    <button
                                      onClick={() => openCompleteModal(q)}
                                      className="p-1 text-green-600 hover:text-green-800 border border-green-200 rounded hover:bg-green-50 cursor-pointer transition-colors"
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
          </div>
        )}

        {activeMainTab === "catalog" && (
          <div className="h-full flex flex-row gap-3 min-h-0">
            {/* Sidebar of Brands */}
            <div className="w-[200px] border border-zinc-200 rounded-lg flex flex-col bg-zinc-50 min-h-0">
              <div className="p-3 border-b border-zinc-200 bg-zinc-100/50 rounded-t-lg">
                <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Brands List</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
                {brands.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 italic text-center py-4">No brands loaded.</p>
                ) : (
                  brands.map((b) => {
                    const count = getProductCountForBrand(b.id);
                    const isSelected = selectedBrandId === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBrandId(b.id)}
                        className={`flex items-center gap-2 p-2 rounded text-left text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-orange-50 border-l-4 border-orange-600 text-orange-700 shadow-xs"
                            : "hover:bg-zinc-200/55 text-zinc-600"
                        }`}
                      >
                        {b.logo_image ? (
                          <img src={b.logo_image} alt={b.display_name} className="w-5 h-5 object-contain rounded bg-white border border-zinc-200" />
                        ) : (
                          <div className="w-5 h-5 rounded bg-zinc-200 border border-zinc-300 flex items-center justify-center text-[10px]">
                            {b.display_name?.charAt(0) || "B"}
                          </div>
                        )}
                        <span className="flex-1 truncate">{b.display_name || b.id}</span>
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-200/60 px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Catalog Products Area */}
            <div className="flex-1 border border-zinc-200 rounded-lg flex flex-col bg-white min-h-0">
              {/* Product header & search */}
              <div className="p-3 border-b border-zinc-200 bg-zinc-50/70 rounded-t-lg flex flex-row items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
                    {selectedBrandId ? `${getBrandName(selectedBrandId)} Products` : "Products"}
                  </h3>
                  <span className="text-[11px] font-semibold text-zinc-500">
                    ({filteredProducts.length} items)
                  </span>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search SKU or Title..."
                    className="pl-8 pr-2.5 py-1 text-xs border border-zinc-300 rounded-md w-[200px] outline-none focus:border-orange-500"
                  />
                  {catalogSearch && (
                    <button 
                      onClick={() => setCatalogSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-xs">
                  <thead className="bg-zinc-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 border-b border-zinc-200 w-[60px]">Thumb</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 border-b border-zinc-200 w-[120px]">SKU</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 border-b border-zinc-200">Product Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 border-b border-zinc-200">Catalog Title</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 border-b border-zinc-200 w-[120px]">Catalog Category</th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-600 border-b border-zinc-200 w-[90px]">Status</th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-600 border-b border-zinc-200 w-[90px]">In Catalog</th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-600 border-b border-zinc-200 w-[70px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-200">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-zinc-400 italic">
                          No matching catalog products found.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const hasMeta = p.product_meta && typeof p.product_meta === "object";
                        const catalogTitle = hasMeta ? (p.product_meta.Title || p.product_meta.Short_Title) : "";
                        const catalogCategory = hasMeta ? p.product_meta.Category : "";
                        
                        return (
                          <tr key={p.sku} className="hover:bg-zinc-50/70 transition-colors">
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              {p.image ? (
                                <img src={p.image} alt={p.sku} className="w-9 h-9 object-contain border border-zinc-200 rounded-md bg-zinc-50" />
                              ) : (
                                <div className="w-9 h-9 border border-dashed border-zinc-300 rounded-md flex items-center justify-center text-[10px] text-zinc-400 bg-zinc-50">
                                  <ImageIcon size={14} />
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap font-bold text-zinc-800">{p.sku}</td>
                            <td className="px-3 py-1.5 font-medium text-zinc-700 truncate max-w-[200px]" title={p.display_name}>{p.display_name}</td>
                            <td className="px-3 py-1.5 text-zinc-600 truncate max-w-[220px]" title={catalogTitle || "-"}>{catalogTitle || <span className="text-zinc-300 italic">-</span>}</td>
                            <td className="px-3 py-1.5 text-zinc-500 whitespace-nowrap">{catalogCategory || <span className="text-zinc-300 italic">-</span>}</td>
                            <td className="px-3 py-1.5 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                p.status === "Active" 
                                  ? "bg-green-50 text-green-700 border-green-200" 
                                  : "bg-zinc-50 text-zinc-500 border-zinc-200"
                              }`}>
                                {p.status === "Active" ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center whitespace-nowrap">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={!!p.list_in_catalog}
                                  onChange={() => handleToggleCatalog(p, !!p.list_in_catalog)}
                                />
                                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                              </label>
                            </td>
                            <td className="px-3 py-1.5 text-center whitespace-nowrap">
                              <button
                                onClick={() => setEditingProduct(p)}
                                className="p-1 border border-zinc-200 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100 cursor-pointer transition-all"
                                title="Edit Catalog Meta"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeMainTab === "setting" && (
          <div className="flex-1 overflow-auto p-6 pb-24 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-6">
                {/* Unified Notification Settings Card */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-xs p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3">
                    <h3 className="text-base font-bold text-zinc-800">Notification Settings</h3>
                    <p className="text-xs text-zinc-500">Configure destination channels for direct sales notifications and order alerts.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Receiver Phone Number */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Receiver Phone Number</label>
                      <input
                        type="text"
                        className="w-full text-sm border border-zinc-300 rounded px-3 py-2 outline-none focus:border-orange-500 font-semibold"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+65xxxxxxxx"
                      />
                      <span className="text-[10px] text-zinc-400 leading-normal">
                        Configure the phone number that receives WhatsApp notifications when new orders or quotations are placed.
                      </span>
                    </div>

                    {/* Sales Admin Email */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Sales Admin Email</label>
                      <input
                        type="email"
                        className="w-full text-sm border border-zinc-300 rounded px-3 py-2 outline-none focus:border-orange-500 font-semibold"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="sales@company.com"
                      />
                      <span className="text-[10px] text-zinc-400 leading-normal">
                        Configure primary recipient email for order alerts and invoice requests.
                      </span>
                    </div>

                    {/* CC Emails */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">CC Emails (Up to 3)</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="email"
                          className="w-full text-sm border border-zinc-300 rounded px-3 py-2 outline-none focus:border-orange-500 font-semibold"
                          value={ccEmail1}
                          onChange={(e) => setCcEmail1(e.target.value)}
                          placeholder="CC Recipient 1"
                        />
                        <input
                          type="email"
                          className="w-full text-sm border border-zinc-300 rounded px-3 py-2 outline-none focus:border-orange-500 font-semibold"
                          value={ccEmail2}
                          onChange={(e) => setCcEmail2(e.target.value)}
                          placeholder="CC Recipient 2"
                        />
                        <input
                          type="email"
                          className="w-full text-sm border border-zinc-300 rounded px-3 py-2 outline-none focus:border-orange-500 font-semibold"
                          value={ccEmail3}
                          onChange={(e) => setCcEmail3(e.target.value)}
                          placeholder="CC Recipient 3"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 mt-2">
                      <button
                        type="button"
                        onClick={() => handleTestTemplate("test_connection")}
                        disabled={testingTemplate !== null || !adminEmail.trim()}
                        className="px-4 py-2 border border-zinc-300 hover:border-zinc-800 text-zinc-700 hover:text-zinc-950 font-bold text-xs rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {testingTemplate === "test_connection" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        Send Test Email
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="px-4 py-2 bg-zinc-800 text-white font-semibold text-xs rounded hover:bg-zinc-900 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Toggles and Triggers */}
              <div className="flex flex-col gap-6">
                {/* Automation & Events Card */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-xs p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between border-b border-zinc-100 pb-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-bold text-zinc-800">Automation & Email Triggers</h3>
                      <p className="text-xs text-zinc-500">Toggle automatic system triggers and send context-aware test emails.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerReminder}
                      disabled={triggeringReminder || !toggleReminderOrder}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 mt-0.5 disabled:opacity-50"
                      title={!toggleReminderOrder ? "Please enable 'Reminder to Order' toggle to run this automation." : "Force execute the inactivity check and dispatch reminder emails immediately."}
                    >
                      {triggeringReminder ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      Send Reminder
                    </button>
                  </div>

                  <div className="flex flex-col">
                    {/* Send Email to Buyer */}
                    <div className="flex items-center justify-between py-3 border-b border-zinc-100 gap-4">
                      <div className="flex flex-col gap-0.5 flex-1 pr-2">
                        <span className="text-sm font-semibold text-zinc-700">Send Email to Buyer</span>
                        <span className="text-xs text-zinc-400">Send order copy to the buyer email automatically.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("new_order")}
                          disabled={testingTemplate !== null}
                          className="px-2.5 py-1.5 border border-zinc-200 hover:border-zinc-800 text-zinc-600 hover:text-zinc-950 font-bold text-[10px] rounded transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {testingTemplate === "new_order" && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          Test Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleSendEmailBuyer(!toggleSendEmailBuyer)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleSendEmailBuyer ? "bg-orange-600" : "bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              toggleSendEmailBuyer ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Reminder to Order */}
                    <div className="flex items-center justify-between py-3 border-b border-zinc-100 gap-4">
                      <div className="flex flex-col gap-0.5 flex-1 pr-2">
                        <span className="text-sm font-semibold text-zinc-700">Reminder to Order</span>
                        <span className="text-xs text-zinc-400">Enable automatic order reminders for inactive buyers.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleTestTemplate("reminder_1")}
                            disabled={testingTemplate !== null}
                            className="px-2 py-1 border border-zinc-200 hover:border-zinc-800 text-zinc-600 hover:text-zinc-950 font-bold text-[9px] rounded transition-all cursor-pointer disabled:opacity-50"
                            title="Test Reminder 1 (Day 14)"
                          >
                            Test R1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestTemplate("reminder_2")}
                            disabled={testingTemplate !== null}
                            className="px-2 py-1 border border-zinc-200 hover:border-zinc-800 text-zinc-600 hover:text-zinc-950 font-bold text-[9px] rounded transition-all cursor-pointer disabled:opacity-50"
                            title="Test Reminder 2 (Day 19)"
                          >
                            Test R2
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestTemplate("reminder_3")}
                            disabled={testingTemplate !== null}
                            className="px-2 py-1 border border-zinc-200 hover:border-zinc-800 text-zinc-600 hover:text-zinc-950 font-bold text-[9px] rounded transition-all cursor-pointer disabled:opacity-50"
                            title="Test Reminder 3 / Escalation (Day 24)"
                          >
                            Test R3
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setToggleReminderOrder(!toggleReminderOrder)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleReminderOrder ? "bg-orange-600" : "bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              toggleReminderOrder ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Order Submission Received */}
                    <div className="flex items-center justify-between py-3 border-b border-zinc-100 gap-4">
                      <div className="flex flex-col gap-0.5 flex-1 pr-2">
                        <span className="text-sm font-semibold text-zinc-700">Order Submission Received</span>
                        <span className="text-xs text-zinc-400">Notify Sales Admin immediately upon order receipt.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("new_order")}
                          disabled={testingTemplate !== null}
                          className="px-2.5 py-1.5 border border-zinc-200 hover:border-zinc-800 text-zinc-600 hover:text-zinc-950 font-bold text-[10px] rounded transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {testingTemplate === "new_order" && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          Test Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleOrderSubmissionReceived(!toggleOrderSubmissionReceived)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleOrderSubmissionReceived ? "bg-orange-600" : "bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              toggleOrderSubmissionReceived ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Update Order */}
                    <div className="flex items-center justify-between py-3 gap-4">
                      <div className="flex flex-col gap-0.5 flex-1 pr-2">
                        <span className="text-sm font-semibold text-zinc-700">Update Order</span>
                        <span className="text-xs text-zinc-400">Notify buyer/admin when status gets updated.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("update_order")}
                          disabled={testingTemplate !== null}
                          className="px-2.5 py-1.5 border border-zinc-200 hover:border-zinc-800 text-zinc-600 hover:text-zinc-950 font-bold text-[10px] rounded transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {testingTemplate === "update_order" && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          Test Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleUpdateOrder(!toggleUpdateOrder)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleUpdateOrder ? "bg-orange-600" : "bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              toggleUpdateOrder ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-zinc-100 mt-2">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="px-4 py-2 bg-zinc-800 text-white font-semibold text-xs rounded hover:bg-zinc-900 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Automation Settings
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completion Dialog Overlay (Order Tab) */}
      {completingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-zinc-200 p-6 max-w-[450px] w-full flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-zinc-800">Set Record Complete</h3>
              <p className="text-xs text-zinc-500">Provide the final billing invoice details for {completingItem.id}.</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">Invoice Number:</label>
                <input
                  type="text"
                  className="border border-zinc-300 rounded px-3 py-1.5 outline-none focus:border-orange-500 text-sm"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV2026-908"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">Invoice Amount ($):</label>
                <input
                  type="text"
                  className="border border-zinc-300 rounded px-3 py-1.5 outline-none focus:border-orange-500 text-sm"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="e.g. 520.50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setCompletingItem(null)}
                disabled={savingCompletion}
                className="px-4 py-2 border border-zinc-300 text-zinc-700 font-semibold rounded hover:bg-zinc-50 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompletion}
                disabled={savingCompletion}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded disabled:opacity-50 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {savingCompletion ? "Saving..." : "Set Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Edit Modal Component */}
      {editingProduct && (
        <CatalogProductEditForm
          product={editingProduct}
          brandName={getBrandName(editingProduct.brands_id)}
          onSave={handleSaveProductMeta}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}

// Catalog Product Edit Form Modal Sub-component
function CatalogProductEditForm({ 
  product, 
  brandName, 
  onSave, 
  onCancel 
}: { 
  product: any; 
  brandName: string; 
  onSave: (data: any) => Promise<void>; 
  onCancel: () => void 
}) {
  const [formData, setFormData] = React.useState({ ...product });
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const addImageInputRef = React.useRef<HTMLInputElement>(null);
  
  const [newImageUrl, setNewImageUrl] = React.useState("");

  // Ensure product_meta structure exists with proper fallbacks
  React.useEffect(() => {
    if (!formData.product_meta || typeof formData.product_meta !== "object") {
      setFormData((prev: any) => ({
        ...prev,
        product_meta: {
          Title: prev.display_name || "",
          Short_Title: "",
          Category: "",
          Short_Des: "",
          Long_Des: "",
          Images: prev.image ? [prev.image] : []
        }
      }));
    }
  }, []);

  const handleChange = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleMetaChange = (key: string, val: any) => {
    setFormData((prev: any) => ({
      ...prev,
      product_meta: {
        ...(prev.product_meta || {}),
        [key]: val
      }
    }));
  };

  // Upload Product Main Thumbnail
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filename = `asset/products/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const currentImage = formData.image;
      const deleteQuery = currentImage ? `&deleteUrl=${encodeURIComponent(currentImage)}` : "";
      
      const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}${deleteQuery}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      if (json.success && json.url) {
        handleChange("image", json.url);
        showToast("Main thumbnail uploaded successfully!", "success");
      } else {
        throw new Error(json.error || "Failed to get upload URL");
      }
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Upload Additional Image
  const handleAddImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filename = `asset/products/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      if (json.success && json.url) {
        const currentList = formData.product_meta?.Images || [];
        handleMetaChange("Images", [...currentList, json.url]);
        showToast("Additional catalog image uploaded!", "success");
      } else {
        throw new Error(json.error || "Failed to get upload URL");
      }
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const currentList = formData.product_meta?.Images || [];
    handleMetaChange("Images", [...currentList, newImageUrl.trim()]);
    setNewImageUrl("");
    showToast("Additional image URL added!", "success");
  };

  const handleRemoveAdditionalImage = (idx: number) => {
    const currentList = formData.product_meta?.Images || [];
    handleMetaChange("Images", currentList.filter((_: any, i: number) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 font-primary">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-lg p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Edit Catalog Meta</h3>
            <p className="text-[10px] text-zinc-500 font-semibold">{formData.sku} &bull; {brandName}</p>
          </div>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-semibold">
          {/* Main Thumbnail Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Product Main Image (Thumbnail)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.image || ""}
                onChange={(e) => handleChange("image", e.target.value)}
                placeholder="Image URL or upload below..."
                className="flex-1 text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleMainImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 text-xs font-bold rounded border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 hover:text-zinc-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
              >
                <Upload size={13} />
                Upload
              </button>
            </div>
            {formData.image && (
              <div className="mt-1 border border-slate-200 rounded-md overflow-hidden h-20 w-20 bg-[#F0F4F9] flex items-center justify-center">
                <img src={formData.image} alt="Main Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Catalog Title</label>
              <input
                type="text"
                value={formData.product_meta?.Title || ""}
                onChange={(e) => handleMetaChange("Title", e.target.value)}
                required
                className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-1.5 text-zinc-900 focus:outline-none focus:border-orange-500 font-semibold"
                placeholder="e.g. Premium Turmeric Paste 400G"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Short Title</label>
              <input
                type="text"
                value={formData.product_meta?.Short_Title || ""}
                onChange={(e) => handleMetaChange("Short_Title", e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-1.5 text-zinc-900 focus:outline-none focus:border-orange-500 font-semibold"
                placeholder="e.g. Turmeric Paste"
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Category</label>
              <input
                type="text"
                value={formData.product_meta?.Category || ""}
                onChange={(e) => handleMetaChange("Category", e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-1.5 text-zinc-900 focus:outline-none focus:border-orange-500 font-semibold"
                placeholder="e.g. Cooking Paste"
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Short Description</label>
              <input
                type="text"
                value={formData.product_meta?.Short_Des || ""}
                onChange={(e) => handleMetaChange("Short_Des", e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-1.5 text-zinc-900 focus:outline-none focus:border-orange-500 font-semibold"
                placeholder="e.g. Ready-to-use aromatic blended fresh turmeric paste."
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Long Description</label>
              <textarea
                value={formData.product_meta?.Long_Des || ""}
                onChange={(e) => handleMetaChange("Long_Des", e.target.value)}
                rows={3}
                className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-1.5 text-zinc-900 focus:outline-none focus:border-orange-500 font-semibold resize-none"
                placeholder="Detailed catalog description of ingredients, directions, benefits..."
              />
            </div>
          </div>

          {/* Additional Images Grid Manager */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
            <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Additional Catalog Images</label>
            
            {/* Horizontal list of current images */}
            <div className="flex flex-row gap-2 flex-wrap items-center bg-zinc-50 p-2 border border-zinc-200 rounded-lg min-h-[60px]">
              {(!formData.product_meta?.Images || formData.product_meta.Images.length === 0) ? (
                <span className="text-zinc-400 italic text-[11px] select-none pl-1">No additional images added.</span>
              ) : (
                formData.product_meta.Images.map((img: string, index: number) => (
                  <div key={index} className="relative w-12 h-12 border border-zinc-300 rounded bg-white group overflow-hidden flex items-center justify-center">
                    <img src={img} alt={`catalog-${index}`} className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalImage(index)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer duration-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Controls to add additional images */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste additional image URL here..."
                className="flex-1 text-xs border border-zinc-300 rounded px-3 py-1.5 outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="h-8 px-3 bg-zinc-700 hover:bg-zinc-800 text-white rounded font-bold cursor-pointer flex items-center justify-center gap-1 transition-all"
              >
                <Plus size={13} />
                Add URL
              </button>
              <input
                type="file"
                ref={addImageInputRef}
                onChange={handleAddImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => addImageInputRef.current?.click()}
                className="h-8 px-3 border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded font-bold cursor-pointer flex items-center justify-center gap-1 transition-all disabled:opacity-50"
              >
                <Upload size={13} />
                Upload File
              </button>
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 text-xs font-bold rounded border border-orange-600 bg-orange-600 hover:bg-orange-700 text-white transition-all cursor-pointer shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
