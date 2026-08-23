"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { NavigationTabs } from "../navigation-tabs";
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
  Mail,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Download,
  AlertCircle
} from "lucide-react";

interface DirectOrderModuleProps {
  profile?: any;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

const mainTabs = [
  { id: "order", label: "Orders & Quotes", desc: "Manage direct retail orders and customer quotations." },
  { id: "catalog", label: "Catalog", desc: "Manage catalog products and metadata visibility." },
  { id: "setting", label: "Settings", desc: "Configure direct sales notifications and automation." }
];

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
  
  // Bulk Excel Upload state
  const fileInputExcelRef = React.useRef<HTMLInputElement>(null);
  const [bulkUpdating, setBulkUpdating] = React.useState(false);
  const [bulkPreviewItems, setBulkPreviewItems] = React.useState<any[] | null>(null);
  const [bulkParseStats, setBulkParseStats] = React.useState<{ totalRows: number; validUpdates: number; skippedEmpty: number } | null>(null);
  
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
            product_meta: updatedProduct.product_meta,
            carton: updatedProduct.carton,
            pallet_ctn: updatedProduct.pallet_ctn,
            storage_condition: updatedProduct.storage_condition,
            shelf_life: updatedProduct.shelf_life,
            carton_weight: updatedProduct.carton_weight,
            carton_l_mm: updatedProduct.carton_l_mm,
            carton_w_mm: updatedProduct.carton_w_mm,
            carton_h_mm: updatedProduct.carton_h_mm
          }
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update failed");

      showToast(`Catalog product specifications saved successfully!`, "success");
      loadData();
    } catch (err: any) {
      showToast("Failed to save product changes: " + err.message, "error");
      setProducts(previousProducts);
    }
  };

  // Download Excel Template with Current Catalog Products and Column Structure
  const handleDownloadTemplate = () => {
    const templateRows = products.map(p => {
      const meta = p.product_meta && typeof p.product_meta === "object" ? p.product_meta : {};
      return {
        "SKU": p.sku || "",
        "Product Name (Ref)": p.display_name || "",
        "Catalog Title": meta.Title || "",
        "Catalog Short Title": meta.Short_Title || "",
        "Catalog Category": meta.Category || "",
        "Short Description": meta.Short_Des || "",
        "Long Description": meta.Long_Des || "",
        "EA/CTN": p.carton !== undefined && p.carton !== null ? p.carton : "",
        "CTN/PLT": p.pallet_ctn !== undefined && p.pallet_ctn !== null ? p.pallet_ctn : "",
        "Storage Condition": p.storage_condition || "",
        "Shelf Life": p.shelf_life || "",
        "Carton Weight (kg)": p.carton_weight !== undefined && p.carton_weight !== null ? p.carton_weight : "",
        "Carton Length (mm)": p.carton_l_mm !== undefined && p.carton_l_mm !== null ? p.carton_l_mm : "",
        "Carton Width (mm)": p.carton_w_mm !== undefined && p.carton_w_mm !== null ? p.carton_w_mm : "",
        "Carton Height (mm)": p.carton_h_mm !== undefined && p.carton_h_mm !== null ? p.carton_h_mm : ""
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(templateRows.length > 0 ? templateRows : [
      {
        "SKU": "SAMPLE-SKU-001",
        "Product Name (Ref)": "Sample Product Name",
        "Catalog Title": "Sample Catalog Title",
        "Catalog Short Title": "Sample Short Title",
        "Catalog Category": "Sample Category",
        "Short Description": "Brief short description",
        "Long Description": "Detailed long description",
        "EA/CTN": 24,
        "CTN/PLT": 80,
        "Storage Condition": "Ambient / Dry",
        "Shelf Life": "24 Months",
        "Carton Weight (kg)": 6.5,
        "Carton Length (mm)": 350,
        "Carton Width (mm)": 240,
        "Carton Height (mm)": 180
      }
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Catalog_Update");
    XLSX.writeFile(workbook, `Catalog_Bulk_Update_Template_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Excel template downloaded successfully!", "success");
  };

  // Upload and Parse Excel File
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        showToast("The uploaded Excel file contains no data rows.", "error");
        return;
      }

      const preparedUpdates: any[] = [];
      let skippedCount = 0;

      rawRows.forEach((row) => {
        // Find SKU column
        const skuKey = Object.keys(row).find(k => k.trim().toLowerCase() === "sku");
        const rawSku = skuKey ? String(row[skuKey] || "").trim() : "";
        if (!rawSku) {
          skippedCount++;
          return;
        }

        // Find existing product
        const existingProd = products.find(p => p.sku.toLowerCase() === rawSku.toLowerCase());
        const existingMeta = existingProd?.product_meta && typeof existingProd.product_meta === "object"
          ? { ...existingProd.product_meta }
          : { Title: existingProd?.display_name || "", Short_Title: "", Category: "", Short_Des: "", Long_Des: "", Images: [] };

        const updateItem: any = {
          sku: existingProd ? existingProd.sku : rawSku,
          display_name: existingProd?.display_name || rawSku,
          updatedFields: []
        };

        let hasAnyField = false;
        const newMeta = { ...existingMeta };

        // Helper to check non-empty string/number
        const getVal = (...keys: string[]) => {
          for (const key of keys) {
            const cleanTarget = key.toLowerCase().replace(/[^a-z0-9]/g, "");
            const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget);
            if (foundKey !== undefined) {
              const val = row[foundKey];
              if (val !== undefined && val !== null && String(val).trim() !== "") {
                return typeof val === "string" ? val.trim() : val;
              }
            }
          }
          return undefined;
        };

        // 1. Catalog Title
        const titleVal = getVal("catalog title", "catalogtitle", "title");
        if (titleVal !== undefined) {
          newMeta.Title = String(titleVal);
          updateItem.updatedFields.push("Catalog Title");
          hasAnyField = true;
        }

        // 2. Catalog Short Title
        const shortTitleVal = getVal("catalog short title", "catalogshorttitle", "short title", "shorttitle");
        if (shortTitleVal !== undefined) {
          newMeta.Short_Title = String(shortTitleVal);
          updateItem.updatedFields.push("Short Title");
          hasAnyField = true;
        }

        // 3. Catalog Category
        const categoryVal = getVal("catalog category", "catalogcategory", "category");
        if (categoryVal !== undefined) {
          newMeta.Category = String(categoryVal);
          updateItem.updatedFields.push("Category");
          hasAnyField = true;
        }

        // 4. Short Description
        const shortDesVal = getVal("short description", "shortdescription", "short des", "shortdes");
        if (shortDesVal !== undefined) {
          newMeta.Short_Des = String(shortDesVal);
          updateItem.updatedFields.push("Short Description");
          hasAnyField = true;
        }

        // 5. Long Description
        const longDesVal = getVal("long description", "longdescription", "long des", "longdes", "description");
        if (longDesVal !== undefined) {
          newMeta.Long_Des = String(longDesVal);
          updateItem.updatedFields.push("Long Description");
          hasAnyField = true;
        }

        if (hasAnyField) {
          updateItem.product_meta = newMeta;
        }

        // 6. EA/CTN
        const cartonVal = getVal("ea/ctn", "eactn", "carton", "ea / ctn", "ea_ctn");
        if (cartonVal !== undefined) {
          updateItem.carton = cartonVal;
          updateItem.updatedFields.push("EA/CTN");
          hasAnyField = true;
        }

        // 7. CTN/PLT
        const palletCtnVal = getVal("ctn/plt", "ctnplt", "pallet ctn", "pallet_ctn", "palletctn", "ctn / plt");
        if (palletCtnVal !== undefined) {
          updateItem.pallet_ctn = palletCtnVal;
          updateItem.updatedFields.push("CTN/PLT");
          hasAnyField = true;
        }

        // 8. Storage Condition
        const storageVal = getVal("storage condition", "storagecondition", "storage");
        if (storageVal !== undefined) {
          updateItem.storage_condition = String(storageVal);
          updateItem.updatedFields.push("Storage");
          hasAnyField = true;
        }

        // 9. Shelf Life / Lifetime
        const shelfLifeVal = getVal("shelf life", "shelflife", "lifetime", "life time");
        if (shelfLifeVal !== undefined) {
          updateItem.shelf_life = String(shelfLifeVal);
          updateItem.updatedFields.push("Shelf Life");
          hasAnyField = true;
        }

        // 10. Carton Weight
        const weightVal = getVal("carton weight (kg)", "carton weight", "cartonweight", "weight");
        if (weightVal !== undefined) {
          updateItem.carton_weight = weightVal;
          updateItem.updatedFields.push("Weight");
          hasAnyField = true;
        }

        // 11. Carton Length
        const lVal = getVal("carton length (mm)", "carton length", "cartonlength", "carton l (mm)", "carton l", "cartonlmm", "carton_l_mm", "length");
        if (lVal !== undefined) {
          updateItem.carton_l_mm = lVal;
          updateItem.updatedFields.push("Length (mm)");
          hasAnyField = true;
        }

        // 12. Carton Width
        const wVal = getVal("carton width (mm)", "carton width", "cartonwidth", "carton w (mm)", "carton w", "cartonwmm", "carton_w_mm", "width");
        if (wVal !== undefined) {
          updateItem.carton_w_mm = wVal;
          updateItem.updatedFields.push("Width (mm)");
          hasAnyField = true;
        }

        // 13. Carton Height
        const hVal = getVal("carton height (mm)", "carton height", "cartonheight", "carton h (mm)", "carton h", "cartonhmm", "carton_h_mm", "height");
        if (hVal !== undefined) {
          updateItem.carton_h_mm = hVal;
          updateItem.updatedFields.push("Height (mm)");
          hasAnyField = true;
        }

        if (hasAnyField) {
          preparedUpdates.push(updateItem);
        } else {
          skippedCount++;
        }
      });

      if (preparedUpdates.length === 0) {
        showToast("No valid update data or matching SKUs found in the file.", "warning");
        return;
      }

      setBulkPreviewItems(preparedUpdates);
      setBulkParseStats({
        totalRows: rawRows.length,
        validUpdates: preparedUpdates.length,
        skippedEmpty: skippedCount
      });
    } catch (err: any) {
      showToast("Failed to parse Excel file: " + err.message, "error");
    } finally {
      if (fileInputExcelRef.current) {
        fileInputExcelRef.current.value = "";
      }
    }
  };

  // Confirm and Execute Bulk Update
  const handleConfirmBulkUpdate = async () => {
    if (!bulkPreviewItems || bulkPreviewItems.length === 0) return;

    setBulkUpdating(true);
    try {
      const payloadItems = bulkPreviewItems.map(item => ({
        sku: item.sku,
        image: item.image,
        product_meta: item.product_meta,
        carton: item.carton,
        pallet_ctn: item.pallet_ctn,
        storage_condition: item.storage_condition,
        shelf_life: item.shelf_life,
        carton_weight: item.carton_weight,
        carton_l_mm: item.carton_l_mm,
        carton_w_mm: item.carton_w_mm,
        carton_h_mm: item.carton_h_mm
      }));

      const res = await fetch(`${WORKER_URL}/api/directorder/catalog/bulk-metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Bulk update failed");

      showToast(`Bulk update complete! Updated ${result.count || payloadItems.length} products.`, "success");
      setBulkPreviewItems(null);
      setBulkParseStats(null);
      loadData();
    } catch (err: any) {
      showToast("Bulk update failed: " + err.message, "error");
    } finally {
      setBulkUpdating(false);
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
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] font-primary relative min-w-0">
      {/* Top Navigation Integration with Main TopBar */}
      <div className="content-header">
        <NavigationTabs
          tabs={mainTabs}
          activeTabId={activeMainTab}
          onTabSelect={(tabId) => setActiveMainTab(tabId as any)}
          titleSuffix="Management"
        />
      </div>

      {/* Main Tab Render Sections */}
      <div className="content-body flex-1 w-full overflow-hidden min-h-0 relative">
        {activeMainTab === "order" && (
          <div className="h-full flex flex-col gap-3 min-h-0">
            {/* Sub Tabs selector for Orders/Quotes in Main Theme */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F0F4F9] border border-slate-200 rounded-lg w-fit shadow-2xs">
              <button
                onClick={() => setActiveOrderTab("orders")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeOrderTab === "orders" 
                    ? "bg-white text-[#0B57D0] shadow-xs border border-slate-200/60" 
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Direct Retail Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveOrderTab("quotes")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeOrderTab === "quotes" 
                    ? "bg-white text-[#0B57D0] shadow-xs border border-slate-200/60" 
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Customer Quotations ({quotes.length})
              </button>
            </div>

            {/* Tables Area */}
            <div className="flex-1 overflow-hidden relative min-h-0 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col">
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
          </div>
        )}

        {activeMainTab === "catalog" && (
          <div className="h-full flex flex-row gap-3 min-h-0">
            {/* Sidebar of Brands */}
            <div className="w-[210px] border border-slate-200 rounded-lg flex flex-col bg-slate-50/50 min-h-0 shadow-xs">
              <div className="p-3 border-b border-slate-200 bg-[#F0F4F9] rounded-t-lg">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Brands List</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                {brands.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic text-center py-4">No brands loaded.</p>
                ) : (
                  brands.map((b) => {
                    const count = getProductCountForBrand(b.id);
                    const isSelected = selectedBrandId === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBrandId(b.id)}
                        className={`flex items-center gap-2 p-2 rounded-md text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#D3E3FD] border-l-4 border-[#0B57D0] text-[#0B57D0] font-bold shadow-xs"
                            : "hover:bg-slate-100 text-zinc-700 font-semibold"
                        }`}
                      >
                        {b.logo_image ? (
                          <img src={b.logo_image} alt={b.display_name} className="w-5 h-5 object-contain rounded bg-white border border-slate-200" />
                        ) : (
                          <div className="w-5 h-5 rounded bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                            {b.display_name?.charAt(0) || "B"}
                          </div>
                        )}
                        <span className="flex-1 truncate">{b.display_name || b.id}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? "bg-[#0B57D0]/15 text-[#0B57D0]" : "text-zinc-600 bg-slate-200/70"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Catalog Products Area */}
            <div className="flex-1 border border-slate-200 rounded-lg flex flex-col bg-white min-h-0 shadow-xs">
              {/* Product header & search */}
              <div className="p-3 border-b border-slate-200 bg-[#F0F4F9] rounded-t-lg flex flex-row items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                    {selectedBrandId ? `${getBrandName(selectedBrandId)} Products` : "Products"}
                  </h3>
                  <span className="text-[11px] font-semibold text-zinc-500">
                    ({filteredProducts.length} items)
                  </span>
                </div>
                
                {/* Actions & Search */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputExcelRef}
                    onChange={handleExcelUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />

                  {/* Prominent Upload Excel Button */}
                  <button
                    type="button"
                    onClick={() => fileInputExcelRef.current?.click()}
                    className="px-3.5 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-md font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Upload Excel to bulk update catalog metadata and specifications"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload Excel</span>
                  </button>

                  {/* Download Template Button */}
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border border-slate-200"
                    title="Download Excel template with all catalog fields and columns"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Template</span>
                  </button>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search SKU or Title..."
                      className="pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-md w-[200px] outline-none focus:border-[#0B57D0] text-zinc-900 font-semibold shadow-xs"
                    />
                    {catalogSearch && (
                      <button 
                        onClick={() => setCatalogSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[60px]">Thumb</th>
                      <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[120px]">SKU</th>
                      <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Product Name</th>
                      <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Catalog Title</th>
                      <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[130px]">Catalog Category</th>
                      <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[90px]">Status</th>
                      <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[100px]">In Catalog</th>
                      <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
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
                          <tr key={p.sku} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              {p.image ? (
                                <img src={p.image} alt={p.sku} className="w-9 h-9 object-contain border border-slate-200 rounded-md bg-[#F0F4F9]" />
                              ) : (
                                <div className="w-9 h-9 border border-dashed border-slate-300 rounded-md flex items-center justify-center text-[10px] text-zinc-400 bg-[#F0F4F9]">
                                  <ImageIcon size={14} />
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2 whitespace-nowrap font-bold text-zinc-900">{p.sku}</td>
                            <td className="px-3.5 py-2 font-medium text-zinc-800 truncate max-w-[200px]" title={p.display_name}>{p.display_name}</td>
                            <td className="px-3.5 py-2 text-zinc-650 truncate max-w-[220px]" title={catalogTitle || "-"}>{catalogTitle || <span className="text-zinc-300 italic">-</span>}</td>
                            <td className="px-3.5 py-2 text-zinc-500 whitespace-nowrap">{catalogCategory || <span className="text-zinc-300 italic">-</span>}</td>
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                p.status === "Active" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-zinc-50 text-zinc-500 border-zinc-200"
                              }`}>
                                {p.status === "Active" ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={!!p.list_in_catalog}
                                  onChange={() => handleToggleCatalog(p, !!p.list_in_catalog)}
                                />
                                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B57D0]"></div>
                              </label>
                            </td>
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => setEditingProduct(p)}
                                className="p-1.5 border border-slate-200 text-zinc-600 hover:text-zinc-950 rounded hover:bg-slate-100 cursor-pointer transition-all shadow-xs"
                                title="Edit Catalog Meta & Specifications"
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
          <div className="flex-1 overflow-auto p-4 max-w-6xl mx-auto w-full no-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="flex flex-col gap-5">
                {/* Unified Notification Settings Card */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-1 border-b border-slate-200/80 pb-3">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Notification Settings</h3>
                    <p className="text-xs text-zinc-500">Configure destination channels for direct sales notifications and order alerts.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Receiver Phone Number */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Receiver Phone Number</label>
                      <input
                        type="text"
                        className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
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
                      <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Sales Admin Email</label>
                      <input
                        type="email"
                        className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
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
                      <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">CC Emails (Up to 3)</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="email"
                          className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                          value={ccEmail1}
                          onChange={(e) => setCcEmail1(e.target.value)}
                          placeholder="CC Recipient 1"
                        />
                        <input
                          type="email"
                          className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                          value={ccEmail2}
                          onChange={(e) => setCcEmail2(e.target.value)}
                          placeholder="CC Recipient 2"
                        />
                        <input
                          type="email"
                          className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                          value={ccEmail3}
                          onChange={(e) => setCcEmail3(e.target.value)}
                          placeholder="CC Recipient 3"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => handleTestTemplate("test_connection")}
                        disabled={testingTemplate !== null || !adminEmail.trim()}
                        className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 font-bold text-xs rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {testingTemplate === "test_connection" && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />}
                        Send Test Email
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Toggles and Triggers */}
              <div className="flex flex-col gap-5">
                {/* Automation & Events Card */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between border-b border-slate-200/80 pb-3 gap-4">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Automation & Email Triggers</h3>
                      <p className="text-xs text-zinc-500">Toggle automatic system triggers and send context-aware test emails.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerReminder}
                      disabled={triggeringReminder || !toggleReminderOrder}
                      className="px-3.5 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                      title={!toggleReminderOrder ? "Please enable 'Reminder to Order' toggle to run this automation." : "Force execute the inactivity check and dispatch reminder emails immediately."}
                    >
                      {triggeringReminder ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      Send Reminder
                    </button>
                  </div>

                  <div className="flex flex-col divide-y divide-slate-100">
                    {/* Send Email to Buyer */}
                    <div className="flex items-center justify-between py-3 gap-4">
                      <div className="flex flex-col gap-0.5 flex-1 pr-2">
                        <span className="text-xs font-bold text-zinc-800">Send Email to Buyer</span>
                        <span className="text-[11px] text-zinc-500 font-medium">Send order copy to the buyer email automatically.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("new_order")}
                          disabled={testingTemplate !== null}
                          className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 font-bold text-[10px] rounded transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {testingTemplate === "new_order" && <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#0B57D0]" />}
                          Test Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleSendEmailBuyer(!toggleSendEmailBuyer)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleSendEmailBuyer ? "bg-[#0B57D0]" : "bg-zinc-200"
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
                    <div className="flex items-center justify-between py-3 gap-4">
                      <div className="flex flex-col gap-0.5 flex-1 pr-2">
                        <span className="text-xs font-bold text-zinc-800">Reminder to Order</span>
                        <span className="text-[11px] text-zinc-500 font-medium">Enable automatic order reminders for inactive buyers.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleTestTemplate("reminder_1")}
                            disabled={testingTemplate !== null}
                            className="px-2 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 font-bold text-[9px] rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Test Reminder 1 (Day 14)"
                          >
                            Test R1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestTemplate("reminder_2")}
                            disabled={testingTemplate !== null}
                            className="px-2 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 font-bold text-[9px] rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Test Reminder 2 (Day 19)"
                          >
                            Test R2
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestTemplate("reminder_3")}
                            disabled={testingTemplate !== null}
                            className="px-2 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 font-bold text-[9px] rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Test Reminder 3 / Escalation (Day 24)"
                          >
                            Test R3
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setToggleReminderOrder(!toggleReminderOrder)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleReminderOrder ? "bg-[#0B57D0]" : "bg-zinc-200"
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
                    <div className="flex items-center justify-between py-3 gap-4">
                      <div className="flex flex-col gap-0.5 flex-1 pr-2">
                        <span className="text-xs font-bold text-zinc-800">Order Submission Received</span>
                        <span className="text-[11px] text-zinc-500 font-medium">Notify Sales Admin immediately upon order receipt.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("new_order")}
                          disabled={testingTemplate !== null}
                          className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 font-bold text-[10px] rounded transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {testingTemplate === "new_order" && <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#0B57D0]" />}
                          Test Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleOrderSubmissionReceived(!toggleOrderSubmissionReceived)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleOrderSubmissionReceived ? "bg-[#0B57D0]" : "bg-zinc-200"
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
                        <span className="text-xs font-bold text-zinc-800">Update Order</span>
                        <span className="text-[11px] text-zinc-500 font-medium">Notify buyer/admin when status gets updated.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("update_order")}
                          disabled={testingTemplate !== null}
                          className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 font-bold text-[10px] rounded transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {testingTemplate === "update_order" && <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#0B57D0]" />}
                          Test Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleUpdateOrder(!toggleUpdateOrder)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                            toggleUpdateOrder ? "bg-[#0B57D0]" : "bg-zinc-200"
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
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100 mt-2">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Automation Settings
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completion Dialog Overlay (Order Tab) */}
      {completingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-[450px] w-full flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wider">Set Record Complete</h3>
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

      {/* Product Edit Modal Component */}
      {editingProduct && (
        <CatalogProductEditForm
          product={editingProduct}
          brandName={getBrandName(editingProduct.brands_id)}
          onSave={handleSaveProductMeta}
          onCancel={() => setEditingProduct(null)}
        />
      )}

      {/* Excel Bulk Update Preview Modal */}
      {bulkPreviewItems && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-2xl w-full flex flex-col gap-4 animate-in fade-in zoom-in duration-150 max-h-[85vh]">
            <div className="flex justify-between items-start pb-2 border-b border-slate-200">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#0B57D0]" />
                  <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Bulk Excel Update Preview</h3>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Found <span className="font-bold text-zinc-900">{bulkPreviewItems.length}</span> product records with updates.
                </p>
              </div>
              <button 
                onClick={() => { setBulkPreviewItems(null); setBulkParseStats(null); }}
                className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 flex items-start gap-2 text-xs text-blue-900">
              <AlertCircle className="w-4 h-4 text-[#0B57D0] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Safe Update Mode:</span> Empty cells in your Excel file are ignored. Only columns with actual non-empty values will be updated for each matching SKU.
              </div>
            </div>

            {/* List of items and what fields will change */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg max-h-[320px]">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-zinc-700 uppercase tracking-wider text-[10px] w-[130px]">SKU</th>
                    <th className="px-3 py-2 text-left font-bold text-zinc-700 uppercase tracking-wider text-[10px] w-[160px]">Product</th>
                    <th className="px-3 py-2 text-left font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Columns To Update</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {bulkPreviewItems.map((item, idx) => (
                    <tr key={item.sku || idx} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-bold text-zinc-900 whitespace-nowrap">{item.sku}</td>
                      <td className="px-3 py-2 text-zinc-700 truncate max-w-[160px]">{item.display_name}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {item.updatedFields?.map((f: string, fIdx: number) => (
                            <span key={fIdx} className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] border border-blue-200 text-[10px] font-semibold">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
              <span className="text-[11px] text-zinc-500">
                {bulkParseStats ? `Processed ${bulkParseStats.totalRows} rows (${bulkParseStats.validUpdates} valid, ${bulkParseStats.skippedEmpty} skipped without changes)` : ""}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setBulkPreviewItems(null); setBulkParseStats(null); }}
                  disabled={bulkUpdating}
                  className="px-4 py-2 border border-slate-200 bg-white text-zinc-700 font-bold rounded-md hover:bg-slate-50 text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkUpdate}
                  disabled={bulkUpdating}
                  className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded-md disabled:opacity-50 text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {bulkUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {bulkUpdating ? "Updating..." : `Confirm & Update (${bulkPreviewItems.length} Products)`}
                </button>
              </div>
            </div>
          </div>
        </div>
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
  const [formData, setFormData] = React.useState({ 
    ...product,
    carton: product.carton !== undefined && product.carton !== null ? product.carton : "",
    pallet_ctn: product.pallet_ctn !== undefined && product.pallet_ctn !== null ? product.pallet_ctn : "",
    storage_condition: product.storage_condition || "",
    shelf_life: product.shelf_life || "",
    carton_weight: product.carton_weight !== undefined && product.carton_weight !== null ? product.carton_weight : "",
    carton_l_mm: product.carton_l_mm !== undefined && product.carton_l_mm !== null ? product.carton_l_mm : "",
    carton_w_mm: product.carton_w_mm !== undefined && product.carton_w_mm !== null ? product.carton_w_mm : "",
    carton_h_mm: product.carton_h_mm !== undefined && product.carton_h_mm !== null ? product.carton_h_mm : ""
  });
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
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-xl p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Edit Catalog & Product Specifications</h3>
            <p className="text-[10px] text-zinc-500 font-semibold">{formData.sku} &bull; {brandName}</p>
          </div>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs font-semibold">
          {/* Main Thumbnail Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Product Main Image (Thumbnail)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.image || ""}
                onChange={(e) => handleChange("image", e.target.value)}
                placeholder="Image URL or upload below..."
                className="flex-1 text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
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
                className="h-8 px-3 text-xs font-bold rounded border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
              >
                <Upload size={13} />
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {formData.image && (
              <div className="mt-1 border border-slate-200 rounded-md overflow-hidden h-20 w-20 bg-[#F0F4F9] flex items-center justify-center shadow-2xs">
                <img src={formData.image} alt="Main Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>

          {/* Section 1: Catalog Details */}
          <div className="flex flex-col gap-2.5 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <h4 className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
              Catalog Presentation Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Catalog Title</label>
                <input
                  type="text"
                  value={formData.product_meta?.Title || ""}
                  onChange={(e) => handleMetaChange("Title", e.target.value)}
                  required
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                  placeholder="e.g. Premium Turmeric Paste 400G"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Short Title</label>
                <input
                  type="text"
                  value={formData.product_meta?.Short_Title || ""}
                  onChange={(e) => handleMetaChange("Short_Title", e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                  placeholder="e.g. Turmeric Paste"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Category</label>
                <input
                  type="text"
                  value={formData.product_meta?.Category || ""}
                  onChange={(e) => handleMetaChange("Category", e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                  placeholder="e.g. Cooking Paste"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Short Description</label>
                <input
                  type="text"
                  value={formData.product_meta?.Short_Des || ""}
                  onChange={(e) => handleMetaChange("Short_Des", e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                  placeholder="e.g. Ready-to-use aromatic blended fresh turmeric paste."
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Long Description</label>
                <textarea
                  value={formData.product_meta?.Long_Des || ""}
                  onChange={(e) => handleMetaChange("Long_Des", e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold resize-none"
                  placeholder="Detailed catalog description of ingredients, directions, benefits..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Packaging & Storage Specs */}
          <div className="flex flex-col gap-2.5 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
            <h4 className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
              Packaging & Storage Specifications
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">EA / CTN</label>
                <input
                  type="text"
                  value={formData.carton}
                  onChange={(e) => handleChange("carton", e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">CTN / PLT</label>
                <input
                  type="text"
                  value={formData.pallet_ctn}
                  onChange={(e) => handleChange("pallet_ctn", e.target.value)}
                  placeholder="e.g. 80"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Storage Condition</label>
                <input
                  type="text"
                  value={formData.storage_condition}
                  onChange={(e) => handleChange("storage_condition", e.target.value)}
                  placeholder="e.g. Ambient / Dry"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Shelf Life / Lifetime</label>
                <input
                  type="text"
                  value={formData.shelf_life}
                  onChange={(e) => handleChange("shelf_life", e.target.value)}
                  placeholder="e.g. 24 Months"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Carton Weight (kg)</label>
                <input
                  type="text"
                  value={formData.carton_weight}
                  onChange={(e) => handleChange("carton_weight", e.target.value)}
                  placeholder="e.g. 6.5"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Carton Length (mm)</label>
                <input
                  type="text"
                  value={formData.carton_l_mm}
                  onChange={(e) => handleChange("carton_l_mm", e.target.value)}
                  placeholder="e.g. 350"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Carton Width (mm)</label>
                <input
                  type="text"
                  value={formData.carton_w_mm}
                  onChange={(e) => handleChange("carton_w_mm", e.target.value)}
                  placeholder="e.g. 240"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Carton Height (mm)</label>
                <input
                  type="text"
                  value={formData.carton_h_mm}
                  onChange={(e) => handleChange("carton_h_mm", e.target.value)}
                  placeholder="e.g. 180"
                  className="w-full text-xs bg-white border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#0B57D0] font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Additional Images Grid Manager */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
            <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Additional Catalog Images</label>
            
            {/* Horizontal list of current images */}
            <div className="flex flex-row gap-2 flex-wrap items-center bg-[#F0F4F9] p-2.5 border border-slate-200 rounded-lg min-h-[60px]">
              {(!formData.product_meta?.Images || formData.product_meta.Images.length === 0) ? (
                <span className="text-zinc-400 italic text-[11px] select-none pl-1">No additional images added.</span>
              ) : (
                formData.product_meta.Images.map((img: string, index: number) => (
                  <div key={index} className="relative w-12 h-12 border border-slate-300 rounded-md bg-white group overflow-hidden flex items-center justify-center shadow-2xs">
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
                className="flex-1 text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 outline-none focus:border-[#0B57D0] font-semibold text-zinc-900"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded font-bold cursor-pointer flex items-center justify-center gap-1 transition-all text-xs shadow-xs"
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
                className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 hover:text-zinc-950 rounded font-bold cursor-pointer flex items-center justify-center gap-1 transition-all disabled:opacity-50 text-xs shadow-xs"
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
              className="h-8 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 text-xs font-bold rounded border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
