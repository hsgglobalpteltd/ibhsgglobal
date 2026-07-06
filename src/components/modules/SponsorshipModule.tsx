"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { 
  TrendingUp, 
  Coins, 
  Users, 
  FileText, 
  Printer, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  RefreshCw 
} from "lucide-react";

interface SponsorshipModuleProps {
  profile?: {
    role: string;
  } | null;
}

interface SkuLink {
  id: string;
  sponsoredBy: string;
  brandName: string;
  sku: string;
  productName: string;
  uom: number;
  cost: number;
}

interface Receiver {
  id: string;
  name: string;
  type: "monthly" | "onetime" | "open";
  limit: number | null; // in cartons
}

interface Transaction {
  id: string;
  ref: string;
  date: number; // numeric Unix epoch timestamp (milliseconds)
  receiverId: string;
  skuId: string; // link to SkuLink
  qtyPcs: number;
  remark: string;
}

// --- CUSTOM SEARCHABLE SELECT FILTER COMPONENT ---
interface SearchableSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

function SearchableSelect({ options, value, onChange, placeholder, disabled = false, className = "" }: SearchableSelectProps) {
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close list on clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync typed search string with selected option label
  React.useEffect(() => {
    const selectedOption = options.find(o => o.value === value);
    setSearch(selectedOption ? selectedOption.label : "");
  }, [value, options]);

  const filteredOptions = React.useMemo(() => {
    if (!search || (options.find(o => o.value === value)?.label === search)) {
      return options;
    }
    const query = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(query));
  }, [search, options, value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        disabled={disabled}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          if (!e.target.value) {
            onChange("");
          }
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        className={`w-full bg-[#F0F4F9] border border-slate-200 rounded h-8 px-2.5 text-zinc-900 font-medium text-xs focus:outline-none focus:border-blue-400 disabled:opacity-50 ${className}`}
      />
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg z-30 text-xs text-left">
          {filteredOptions.length === 0 ? (
            <div className="p-2.5 text-zinc-400 italic">No matches found</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setSearch(opt.label);
                  setIsOpen(false);
                }}
                className={`p-2.5 cursor-pointer hover:bg-zinc-100 flex items-center justify-between ${
                  value === opt.value ? "bg-zinc-100 font-bold" : ""
                }`}
              >
                <span>{opt.label}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function SponsorshipModule({ profile }: SponsorshipModuleProps) {
  const userRole = React.useMemo(() => {
    const role = profile?.role;
    if (role === "Administrator" || role === "Manager") return "admin";
    if (role === "Operator" || role === "Operation") return "operator";
    return "viewer";
  }, [profile]);

  const tabs = [
    { id: "dashboard", label: "Dashboard", desc: "Overview of sponsorship distribution." },
    { id: "transaction", label: "Transaction", desc: "Record and manage distribution outputs." },
    { id: "sponsored", label: "Sponsored By", desc: "Configure brand owners and sponsored product SKUs." },
    { id: "receiver", label: "Receiver", desc: "Manage receiving entities and limits." }
  ];

  const [activeTab, setActiveTab] = React.useState<string>("dashboard");
  const [fetching, setFetching] = React.useState<boolean>(false);

  // Core database sources
  const [brandsList, setBrandsList] = React.useState<any[]>([]);
  const [productsList, setProductsList] = React.useState<any[]>([]);

  // Sponsorship local states
  const [catalog, setCatalog] = React.useState<SkuLink[]>([]);
  const [receivers, setReceivers] = React.useState<Receiver[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  // Transaction form states
  const [txId, setTxId] = React.useState<string | null>(null);
  const [txRef, setTxRef] = React.useState<string>("");
  const [txDate, setTxDate] = React.useState<string>("");
  const [txReceiverId, setTxReceiverId] = React.useState<string>("");
  const [txSkuId, setTxSkuId] = React.useState<string>("");
  const [txQty, setTxQty] = React.useState<string>("");
  const [txRemark, setTxRemark] = React.useState<string>("");
  const [txItems, setTxItems] = React.useState<Array<{ skuId: string; qtyPcs: number }>>([]);
  const [txSponsoredBy, setTxSponsoredBy] = React.useState<string>("");

  // Sponsored form states
  const [sponsoredBy, setSponsoredBy] = React.useState<string>("");
  const [selectedBrand, setSelectedBrand] = React.useState<string>("");
  const [selectedProductSku, setSelectedProductSku] = React.useState<string>("");
  const [sponsoredCatalogId, setSponsoredCatalogId] = React.useState<string | null>(null);

  // Receiver form states
  const [recId, setRecId] = React.useState<string | null>(null);
  const [recName, setRecName] = React.useState<string>("");
  const [recType, setRecType] = React.useState<"monthly" | "onetime" | "open">("monthly");
  const [recLimit, setRecLimit] = React.useState<string>("");

  // Dashboard filter state
  const [dashStartDate, setDashStartDate] = React.useState<string>("");
  const [dashEndDate, setDashEndDate] = React.useState<string>("");
  const [dashSponsorFilter, setDashSponsorFilter] = React.useState<string>("all");

  // Sidebar Panel collapse states (collapsed by default)
  const [isTxFormOpen, setIsTxFormOpen] = React.useState<boolean>(false);
  const [isCatalogFormOpen, setIsCatalogFormOpen] = React.useState<boolean>(false);
  const [isReceiverFormOpen, setIsReceiverFormOpen] = React.useState<boolean>(false);

  // Load static DBs and sponsorship outbox state on mount
  React.useEffect(() => {
    loadCachedSponsorshipData();
    fetchAllFreshData(false);
  }, []);

  const loadCachedSponsorshipData = () => {
    try {
      const cachedBrands = localStorage.getItem("brands_DB_data");
      const cachedProducts = localStorage.getItem("products_DB_data");
      const cachedCatalog = localStorage.getItem("sponsorship_catalog_data");
      const cachedReceivers = localStorage.getItem("sponsorship_receivers_data");
      const cachedTx = localStorage.getItem("sponsorship_transactions_data");

      if (cachedBrands) setBrandsList(JSON.parse(cachedBrands));
      if (cachedProducts) setProductsList(JSON.parse(cachedProducts));

      if (cachedCatalog) {
        const items = JSON.parse(cachedCatalog);
        setCatalog(items.map((item: any) => ({
          id: item.ID || item.id,
          sponsoredBy: item["Sponsored By"] || item.sponsoredBy || "",
          brandName: item["Brand Name"] || item.brandName,
          sku: item.SKU || item.sku,
          productName: item["Product Name"] || item.productName,
          uom: parseInt(item.UOM || item.uom) || 24,
          cost: parseFloat(item.Cost || item.cost) || 0
        })));
      }
      if (cachedReceivers) {
        const items = JSON.parse(cachedReceivers);
        setReceivers(items.map((item: any) => ({
          id: item.ID || item.id,
          name: item.Name || item.name,
          type: item.Type || item.type,
          limit: item.Limit !== undefined && item.Limit !== null && item.Limit !== "" ? parseFloat(item.Limit || item.limit) : null
        })));
      }
      if (cachedTx) {
        const items = JSON.parse(cachedTx);
        setTransactions(items.map((item: any) => ({
          id: item.ID || item.id,
          ref: item.Ref || item.ref,
          date: parseInt(item.Date || item.date) || Date.now(),
          receiverId: item["Receiver ID"] || item.receiverId,
          skuId: item["SKU ID"] || item.skuId,
          qtyPcs: parseInt(item["Qty Pcs"] || item.qtyPcs) || 0,
          remark: item.Remark || item.remark || ""
        })));
      }
    } catch (e) {
      console.warn("Failed to load cached sponsorship data:", e);
    }
  };

  // Helper to make updates to server
  const writeToDatabase = async (sheetName: string, action: string, data: any) => {
    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: sheetName,
          action,
          data
        })
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Update failed");
      return true;
    } catch (err: any) {
      console.error("Database write error:", err);
      throw err;
    }
  };

  // Fetch all sheets fresh from server
  const fetchAllFreshData = async (forceSync = false) => {
    setFetching(true);
    try {
      const sheets: Array<"brands_DB" | "products_DB" | "sponsorship_catalog" | "sponsorship_receivers" | "sponsorship_transactions"> = [
        "brands_DB",
        "products_DB",
        "sponsorship_catalog",
        "sponsorship_receivers",
        "sponsorship_transactions"
      ];

      if (forceSync) {
        showToast("Updating database caches from Google Sheets...", "info");
        await Promise.all(
          sheets.map(sheet => 
            fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheet}`, { method: "POST" })
          )
        );
      }

      const [brands, products, catalogData, receiversData, transactionsData] = await Promise.all(
        sheets.map(async sheet => {
          const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheet}`);
          if (!res.ok) return [];
          const json = await res.json();
          const items = Array.isArray(json) ? json : (json.value || []);
          localStorage.setItem(`${sheet}_data`, JSON.stringify(items));
          return items;
        })
      );

      setBrandsList(brands);
      setProductsList(products);
      
      const newCatalog = catalogData.map((item: any) => ({
        id: item.ID,
        sponsoredBy: item["Sponsored By"] || "",
        brandName: item["Brand Name"],
        sku: item.SKU,
        productName: item["Product Name"],
        uom: parseInt(item.UOM) || 24,
        cost: parseFloat(item.Cost) || 0
      }));
      setCatalog(newCatalog);
      localStorage.setItem("sponsorship_catalog_data", JSON.stringify(catalogData));

      const newReceivers = receiversData.map((item: any) => ({
        id: item.ID,
        name: item.Name,
        type: item.Type,
        limit: item.Limit !== null && item.Limit !== "" ? parseFloat(item.Limit) : null
      }));
      setReceivers(newReceivers);
      localStorage.setItem("sponsorship_receivers_data", JSON.stringify(receiversData));

      const newTransactions = transactionsData.map((item: any) => ({
        id: item.ID,
        ref: item.Ref,
        date: parseInt(item.Date) || Date.now(),
        receiverId: item["Receiver ID"],
        skuId: item["SKU ID"],
        qtyPcs: parseInt(item["Qty Pcs"]) || 0,
        remark: item.Remark || ""
      }));
      setTransactions(newTransactions);
      localStorage.setItem("sponsorship_transactions_data", JSON.stringify(transactionsData));

      if (forceSync) {
        showToast("Database updated successfully!", "success");
      }
    } catch (err: any) {
      showToast("Failed to refresh records: " + err.message, "error");
    } finally {
      setFetching(false);
    }
  };

  // Convert Date string to Unix epoch timestamp (milliseconds) for storage
  const dateToEpoch = (dateStr: string): number => {
    if (!dateStr) return Date.now();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  };

  // Convert Epoch to YYYY-MM-DD for date inputs
  const epochToInputVal = (epoch: number): string => {
    try {
      const d = new Date(epoch);
      return d.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  // Format Unix epoch timestamp (milliseconds) as dd/mm/yyyy for UI
  const formatEpochToDDMMYYYY = (epoch: number): string => {
    try {
      const d = new Date(epoch);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return "-";
    }
  };

  // --- CATALOG (SPONSORED BY) LOGIC ---
  const filteredProductsSelect = React.useMemo(() => {
    if (!selectedBrand) return [];
    const targetBrand = brandsList.find(b => String(b.ID) === selectedBrand || b["Display Name"] === selectedBrand);
    const targetBrandId = targetBrand ? String(targetBrand.ID) : selectedBrand;
    
    return productsList.filter(p => String(p["Brands ID"]) === targetBrandId || p["Brand Name"] === selectedBrand);
  }, [selectedBrand, productsList, brandsList]);

  const handleEditCatalog = (item: SkuLink) => {
    if (userRole === "viewer") {
      showToast("Access Denied: Viewers cannot edit the catalog.", "error");
      return;
    }
    setSponsoredCatalogId(item.id);
    setSponsoredBy(item.sponsoredBy || "");
    const brand = brandsList.find(b => 
      b["Display Name"]?.trim().toLowerCase() === item.brandName?.trim().toLowerCase()
    );
    setSelectedBrand(brand ? String(brand.ID) : item.brandName);
    setSelectedProductSku(item.sku);
    setIsCatalogFormOpen(true);
    showToast("Editing sponsored product entry...", "info");
  };

  const handleCancelCatalogEdit = () => {
    setSponsoredCatalogId(null);
    setSponsoredBy("");
    setSelectedBrand("");
    setSelectedProductSku("");
  };

  const handleAddCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "viewer") {
      showToast("Access Denied: Viewers cannot modify the catalog.", "error");
      return;
    }
    if (!sponsoredBy.trim() || !selectedBrand || !selectedProductSku) {
      showToast("Please enter Sponsor, select a brand owner and sponsored product SKU.", "error");
      return;
    }

    const brand = brandsList.find(b => String(b.ID) === selectedBrand || b["Display Name"] === selectedBrand);
    const brandName = brand ? brand["Display Name"] : selectedBrand;

    const product = productsList.find(p => p.SKU === selectedProductSku);
    if (!product) {
      showToast("Product SKU not found in database.", "error");
      return;
    }

    const uom = parseInt(product.Carton) || 24;
    const cost = parseFloat(product.Cost) || 0;

    const isEdit = !!sponsoredCatalogId;

    const exists = catalog.some(c => 
      c.id !== sponsoredCatalogId && 
      c.sku === selectedProductSku && 
      c.sponsoredBy.trim().toLowerCase() === sponsoredBy.trim().toLowerCase()
    );
    if (exists) {
      showToast("This Brand SKU sponsorship is already in the catalog under this sponsor.", "error");
      return;
    }

    const targetId = isEdit ? sponsoredCatalogId : "link_" + Date.now();
    const action = isEdit ? "update" : "insert";

    const newLinkData = {
      ID: targetId,
      "Sponsored By": sponsoredBy.trim(),
      "Brand Name": brandName,
      SKU: selectedProductSku,
      "Product Name": product["Display Name"] || "N/A",
      UOM: uom,
      Cost: cost
    };

    // --- INSTANT FRONTEND UPDATE ---
    let updated = [...catalog];
    if (isEdit) {
      updated = updated.map(c => c.id === targetId ? {
        id: targetId,
        sponsoredBy: sponsoredBy.trim(),
        brandName,
        sku: selectedProductSku,
        productName: newLinkData["Product Name"],
        uom,
        cost
      } : c);
    } else {
      updated.push({
        id: targetId,
        sponsoredBy: sponsoredBy.trim(),
        brandName,
        sku: selectedProductSku,
        productName: newLinkData["Product Name"],
        uom,
        cost
      });
    }

    setCatalog(updated);
    localStorage.setItem("sponsorship_catalog_data", JSON.stringify(updated.map(c => ({
      ID: c.id,
      "Sponsored By": c.sponsoredBy,
      "Brand Name": c.brandName,
      SKU: c.sku,
      "Product Name": c.productName,
      UOM: c.uom,
      Cost: c.cost
    }))));
    
    setSponsoredCatalogId(null);
    setSponsoredBy("");
    setSelectedProductSku("");
    showToast(isEdit ? "Sponsorship updated." : "Product added to catalog.", "success");

    // --- SILENT BACKGROUND SAVE ---
    writeToDatabase("sponsorship_catalog", action, newLinkData)
      .catch((err) => {
        showToast("Background sync failed for catalog item: " + err.message, "warning");
      });
  };

  const handleDeleteCatalog = (id: string) => {
    if (userRole !== "admin") {
      showToast("Access Denied: Only Admins can delete catalog links.", "error");
      return;
    }
    const isUsed = transactions.some(t => t.skuId === id);
    if (isUsed) {
      showToast("Cannot remove product. It is referenced in distribution history.", "error");
      return;
    }

    // --- INSTANT FRONTEND UPDATE ---
    const updated = catalog.filter(c => c.id !== id);
    setCatalog(updated);
    localStorage.setItem("sponsorship_catalog_data", JSON.stringify(updated.map(c => ({
      ID: c.id,
      "Sponsored By": c.sponsoredBy,
      "Brand Name": c.brandName,
      SKU: c.sku,
      "Product Name": c.productName,
      UOM: c.uom,
      Cost: c.cost
    }))));
    showToast("Sponsorship deleted.", "success");

    // --- SILENT BACKGROUND SAVE ---
    writeToDatabase("sponsorship_catalog", "delete", { ID: id })
      .catch((err) => {
        showToast("Background sync failed to delete catalog item: " + err.message, "warning");
      });
  };

  // --- RECEIVER LOGIC ---
  const calculateGivenCartons = (receiverId: string, limitType: string, targetDateEpoch: number = Date.now()) => {
    const targetDate = new Date(targetDateEpoch);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    let relevantTx = transactions.filter(t => t.receiverId === receiverId);

    if (limitType === "monthly") {
      relevantTx = relevantTx.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
      });
    }

    return relevantTx.reduce((sum, t) => {
      const link = catalog.find(c => c.id === t.skuId);
      const uom = link ? link.uom : 1;
      return sum + (t.qtyPcs / uom);
    }, 0);
  };

  const handleEditReceiver = (rec: Receiver) => {
    if (userRole === "viewer") {
      showToast("Access Denied: Viewers cannot edit receivers.", "error");
      return;
    }
    setRecId(rec.id);
    setRecName(rec.name);
    setRecType(rec.type);
    setRecLimit(rec.limit !== null ? String(rec.limit) : "");
    setIsReceiverFormOpen(true);
    showToast("Editing receiver entity...", "info");
  };

  const handleCancelReceiverEdit = () => {
    setRecId(null);
    setRecName("");
    setRecType("monthly");
    setRecLimit("");
  };

  const handleAddReceiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "viewer") {
      showToast("Access Denied: Viewers cannot register receivers.", "error");
      return;
    }
    if (!recName.trim()) {
      showToast("Please enter an entity name.", "error");
      return;
    }

    let limit: number | null = null;
    if (recType !== "open") {
      limit = parseFloat(recLimit);
      if (isNaN(limit) || limit <= 0) {
        showToast("Please enter a valid carton limit.", "error");
        return;
      }
    }

    const isEdit = !!recId;
    const targetId = isEdit ? recId : "rec_" + Date.now();
    const action = isEdit ? "update" : "insert";

    const newRecData = {
      ID: targetId,
      Name: recName.trim(),
      Type: recType,
      Limit: limit !== null ? limit : ""
    };

    // --- INSTANT FRONTEND UPDATE ---
    let updated = [...receivers];
    if (isEdit) {
      updated = updated.map(r => r.id === targetId ? {
        id: targetId,
        name: newRecData.Name,
        type: recType,
        limit
      } : r);
    } else {
      updated.push({
        id: targetId,
        name: newRecData.Name,
        type: recType,
        limit
      });
    }

    setReceivers(updated);
    localStorage.setItem("sponsorship_receivers_data", JSON.stringify(updated.map(r => ({
      ID: r.id,
      Name: r.name,
      Type: r.type,
      Limit: r.limit !== null ? r.limit : ""
    }))));

    setRecId(null);
    setRecName("");
    setRecLimit("");
    showToast(isEdit ? "Receiver updated." : "Receiver registered.", "success");

    // --- SILENT BACKGROUND SAVE ---
    writeToDatabase("sponsorship_receivers", action, newRecData)
      .catch((err) => {
        showToast("Background sync failed for receiver: " + err.message, "warning");
      });
  };

  const handleDeleteReceiver = (id: string) => {
    if (userRole !== "admin") {
      showToast("Access Denied: Only Admins can delete receivers.", "error");
      return;
    }
    const isUsed = transactions.some(t => t.receiverId === id);
    if (isUsed) {
      showToast("Cannot remove receiver. Transactions are logged under this entity.", "error");
      return;
    }

    // --- INSTANT FRONTEND UPDATE ---
    const updated = receivers.filter(r => r.id !== id);
    setReceivers(updated);
    localStorage.setItem("sponsorship_receivers_data", JSON.stringify(updated.map(r => ({
      ID: r.id,
      Name: r.name,
      Type: r.type,
      Limit: r.limit !== null ? r.limit : ""
    }))));
    showToast("Receiver removed.", "success");

    // --- SILENT BACKGROUND SAVE ---
    writeToDatabase("sponsorship_receivers", "delete", { ID: id })
      .catch((err) => {
        showToast("Background sync failed to delete receiver: " + err.message, "warning");
      });
  };

  // --- TRANSACTION LOGIC ---
  const handleAddItemToList = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!txSkuId || !txQty) {
      showToast("Select a SKU and enter quantity first.", "error");
      return;
    }
    const qty = parseInt(txQty);
    if (isNaN(qty) || qty <= 0) {
      showToast("Quantity must be a positive number.", "error");
      return;
    }
    if (txItems.some(item => item.skuId === txSkuId)) {
      showToast("SKU already added in this transaction list. Remove it first to re-add.", "warning");
      return;
    }
    setTxItems(prev => [...prev, { skuId: txSkuId, qtyPcs: qty }]);
    setTxSkuId("");
    setTxQty("");
  };

  const currentBalanceStatus = React.useMemo(() => {
    if (!txReceiverId) return { ok: true, msg: "Select a receiver" };
    const rec = receivers.find(r => r.id === txReceiverId);
    if (!rec) return { ok: true, msg: "" };

    const selectedEpoch = txDate ? dateToEpoch(txDate) : Date.now();
    const givenCartons = calculateGivenCartons(rec.id, rec.type, selectedEpoch);

    if (rec.type === "open") {
      return { ok: true, msg: `Balance OK: Unlimited cartons.` };
    }

    let remaining = rec.limit! - givenCartons;

    if (txId) {
      const editingTx = transactions.find(t => t.id === txId);
      if (editingTx && editingTx.receiverId === txReceiverId) {
        let adjust = false;
        if (rec.type === "onetime") adjust = true;
        if (rec.type === "monthly") {
          const editDate = new Date(editingTx.date);
          const selDate = new Date(selectedEpoch);
          if (editDate.getMonth() === selDate.getMonth() && editDate.getFullYear() === selDate.getFullYear()) {
            adjust = true;
          }
        }
        if (adjust) {
          const link = catalog.find(c => c.id === editingTx.skuId);
          const uom = link ? link.uom : 1;
          remaining += (editingTx.qtyPcs / uom);
        }
      }
    }

    const requestedCartons = txItems.reduce((sum, item) => {
      const link = catalog.find(c => c.id === item.skuId);
      const uom = link ? link.uom : 24;
      return sum + (item.qtyPcs / uom);
    }, 0);

    if (remaining <= 0) {
      return { 
        ok: false, 
        msg: `LIMIT EXCEEDED: Entity reached limit of ${rec.limit} cartons.`, 
        warningClass: "text-red-600 font-bold" 
      };
    }

    if (requestedCartons > remaining) {
      return { 
        ok: false, 
        msg: `LIMIT WARNING: Items (${requestedCartons.toFixed(1)} ctn) exceed remaining balance (${remaining.toFixed(1)} ctn).`, 
        warningClass: "text-amber-600 font-bold" 
      };
    }

    const timeFrame = rec.type === "monthly" ? "this month" : "total";
    return { 
      ok: true, 
      msg: `Balance OK: ${remaining.toFixed(1)} cartons remaining ${timeFrame}.`, 
      warningClass: "text-green-600" 
    };
  }, [txReceiverId, txDate, txItems, txId, receivers, transactions, catalog]);

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "viewer") {
      showToast("Access Denied: Viewers cannot record transactions.", "error");
      return;
    }
    if (!txRef.trim() || !txDate || !txReceiverId || txItems.length === 0) {
      showToast("Please fill in Ref, Date, Receiver and add at least one SKU.", "error");
      return;
    }

    const epochMs = dateToEpoch(txDate);
    const isEdit = !!txId;

    const rec = receivers.find(r => r.id === txReceiverId);
    if (rec && rec.type !== "open") {
      const given = calculateGivenCartons(rec.id, rec.type, epochMs);
      let remaining = rec.limit! - given;

      if (isEdit) {
        const editingTx = transactions.find(t => t.id === txId);
        if (editingTx && editingTx.receiverId === txReceiverId) {
          let adjust = false;
          if (rec.type === "onetime") adjust = true;
          if (rec.type === "monthly") {
            const editDate = new Date(editingTx.date);
            const selDate = new Date(epochMs);
            if (editDate.getMonth() === selDate.getMonth() && editDate.getFullYear() === selDate.getFullYear()) {
              adjust = true;
            }
          }
          if (adjust) {
            const link = catalog.find(c => c.id === editingTx.skuId);
            const uom = link ? link.uom : 1;
            remaining += (editingTx.qtyPcs / uom);
          }
        }
      }

      const totalCtns = txItems.reduce((sum, item) => {
        const link = catalog.find(c => c.id === item.skuId);
        return sum + (item.qtyPcs / (link ? link.uom : 24));
      }, 0);

      if (remaining <= 0 || totalCtns > remaining) {
        showToast("Warning: This transaction exceeds receiver limits.", "warning");
      }
    }

    // --- SILENT BACKGROUND SAVE FOR EACH ITEM ---
    txItems.forEach((item, index) => {
      const targetId = (isEdit && index === 0) ? txId : `tx_${Date.now()}_${index}`;
      const action = (isEdit && index === 0) ? "update" : "insert";

      const txPayload = {
        ID: targetId,
        Ref: txRef.trim(),
        Date: epochMs,
        "Receiver ID": txReceiverId,
        "SKU ID": item.skuId,
        "Qty Pcs": item.qtyPcs,
        Remark: txRemark.trim()
      };

      writeToDatabase("sponsorship_transactions", action, txPayload)
        .catch((err) => {
          showToast(`Background sync failed for SKU [${targetId}]: ` + err.message, "warning");
        });
    });

    // --- INSTANT OPTIMISTIC FRONTEND UPDATE ---
    let updatedTransactions = [...transactions];
    if (isEdit) {
      updatedTransactions = updatedTransactions.filter(t => t.id !== txId);
    }

    const newTxList = txItems.map((item, index) => ({
      id: (isEdit && index === 0) ? txId : `tx_${Date.now()}_${index}`,
      ref: txRef.trim(),
      date: epochMs,
      receiverId: txReceiverId,
      skuId: item.skuId,
      qtyPcs: item.qtyPcs,
      remark: txRemark.trim()
    }));

    const finalTransactions = [...newTxList, ...updatedTransactions];
    setTransactions(finalTransactions);
    localStorage.setItem("sponsorship_transactions_data", JSON.stringify(finalTransactions.map(t => ({
      ID: t.id,
      Ref: t.ref,
      Date: t.date,
      "Receiver ID": t.receiverId,
      "SKU ID": t.skuId,
      "Qty Pcs": t.qtyPcs,
      Remark: t.remark
    }))));

    // Reset Form states
    setTxId(null);
    setTxRef("");
    setTxQty("");
    setTxRemark("");
    setTxSkuId("");
    setTxReceiverId("");
    setTxItems([]);
    setTxSponsoredBy("");

    showToast(isEdit ? "Transaction updated." : "Transaction logged.", "success");
  };

  const handleEditTransaction = (id: string) => {
    if (userRole === "viewer") {
      showToast("Access Denied: Viewers cannot edit transactions.", "error");
      return;
    }
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    setTxId(tx.id);
    setTxRef(tx.ref);
    setTxDate(epochToInputVal(tx.date));
    setTxReceiverId(tx.receiverId);
    setTxRemark(tx.remark);
    
    setTxItems([{ skuId: tx.skuId, qtyPcs: tx.qtyPcs }]);
    const link = catalog.find(c => c.id === tx.skuId);
    if (link) {
      setTxSponsoredBy(link.sponsoredBy || "");
    }
    setIsTxFormOpen(true);
    showToast("Editing transaction entry...", "info");
  };

  const handleDeleteTransaction = (id: string) => {
    if (userRole !== "admin") {
      showToast("Access Denied: Only Admins can delete transactions.", "error");
      return;
    }
    // --- INSTANT FRONTEND UPDATE ---
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem("sponsorship_transactions_data", JSON.stringify(updated.map(t => ({
      ID: t.id,
      Ref: t.ref,
      Date: t.date,
      "Receiver ID": t.receiverId,
      "SKU ID": t.skuId,
      "Qty Pcs": t.qtyPcs,
      Remark: t.remark
    }))));
    showToast("Transaction deleted.", "success");

    // --- SILENT BACKGROUND SAVE ---
    writeToDatabase("sponsorship_transactions", "delete", { ID: id })
      .catch((err) => {
        showToast("Background sync failed to delete transaction: " + err.message, "warning");
      });
  };

  const handleCancelTxEdit = () => {
    setTxId(null);
    setTxRef("");
    setTxQty("");
    setTxRemark("");
    setTxSkuId("");
    setTxReceiverId("");
    setTxDate(epochToInputVal(Date.now()));
    setTxItems([]);
    setTxSponsoredBy("");
  };

  // --- DASHBOARD MATHS ---
  const dashboardStats = React.useMemo(() => {
    let filtered = transactions;

    if (dashStartDate) {
      const startEpoch = dateToEpoch(dashStartDate);
      filtered = filtered.filter(t => t.date >= startEpoch);
    }
    if (dashEndDate) {
      const endEpoch = dateToEpoch(dashEndDate) + 86399999; // Include the end date fully (end of day)
      filtered = filtered.filter(t => t.date <= endEpoch);
    }
    if (dashSponsorFilter && dashSponsorFilter !== "all") {
      filtered = filtered.filter(t => {
        const link = catalog.find(c => c.id === t.skuId);
        return link && link.sponsoredBy === dashSponsorFilter;
      });
    }

    let totalCartons = 0;
    let totalCost = 0;

    filtered.forEach(t => {
      const link = catalog.find(c => c.id === t.skuId);
      if (link) {
        const ctns = t.qtyPcs / link.uom;
        totalCartons += ctns;
        totalCost += (t.qtyPcs * link.cost);
      }
    });

    const summaryMap: Record<string, Record<string, { sponsoredBy: string; ctns: number; qtyPcs: number; cost: number; skuCode: string; uom: number }>> = {};
    filtered.forEach(t => {
      const link = catalog.find(c => c.id === t.skuId);
      if (link) {
        const sponsor = link.sponsoredBy || "-";
        const key = `${sponsor}_${link.brandName}`;
        if (!summaryMap[key]) summaryMap[key] = {};
        if (!summaryMap[key][link.productName]) {
          summaryMap[key][link.productName] = { sponsoredBy: sponsor, ctns: 0, qtyPcs: 0, cost: 0, skuCode: link.sku, uom: link.uom };
        }
        const ctns = t.qtyPcs / link.uom;
        summaryMap[key][link.productName].ctns += ctns;
        summaryMap[key][link.productName].qtyPcs += t.qtyPcs;
        summaryMap[key][link.productName].cost += (t.qtyPcs * link.cost);
      }
    });

    const summaryList: Array<{ sponsoredBy: string; brand: string; skuName: string; skuCode: string; ctns: number; qtyPcs: number; uom: number; cost: number }> = [];
    for (const key in summaryMap) {
      const separatorIdx = key.indexOf("_");
      const sponsoredBy = key.substring(0, separatorIdx);
      const brand = key.substring(separatorIdx + 1);
      for (const skuName in summaryMap[key]) {
        summaryList.push({
          sponsoredBy,
          brand,
          skuName,
          skuCode: summaryMap[key][skuName].skuCode,
          ctns: summaryMap[key][skuName].ctns,
          qtyPcs: summaryMap[key][skuName].qtyPcs,
          uom: summaryMap[key][skuName].uom,
          cost: summaryMap[key][skuName].cost
        });
      }
    }

    return {
      totalCartons,
      totalTransactions: filtered.length,
      totalCost,
      summaryList
    };
  }, [dashStartDate, dashEndDate, dashSponsorFilter, transactions, catalog]);

  const handlePrintClaim = () => {
    const filterValue = dashSponsorFilter === "all" ? "All Sponsors" : dashSponsorFilter;

    let startEpoch = 0;
    let endEpoch = Infinity;

    if (dashStartDate) {
      startEpoch = new Date(dashStartDate).setHours(0, 0, 0, 0);
    }
    if (dashEndDate) {
      endEpoch = new Date(dashEndDate).setHours(23, 59, 59, 999);
    }

    const relevantTx = transactions.filter(t => {
      const link = catalog.find(c => c.id === t.skuId);
      if (!link) return false;
      if (dashSponsorFilter && dashSponsorFilter !== "all") {
        if (link.sponsoredBy !== dashSponsorFilter) return false;
      }
      if (t.date < startEpoch) return false;
      if (t.date > endEpoch) return false;
      return true;
    });

    if (relevantTx.length === 0) {
      showToast(`No logged distributions found for ${filterValue} in the selected period.`, "warning");
      return;
    }

    let periodText = "All Time";
    if (dashStartDate && dashEndDate) {
      periodText = `${formatEpochToDDMMYYYY(new Date(dashStartDate).getTime())} - ${formatEpochToDDMMYYYY(new Date(dashEndDate).getTime())}`;
    } else if (dashStartDate) {
      periodText = `From ${formatEpochToDDMMYYYY(new Date(dashStartDate).getTime())}`;
    } else if (dashEndDate) {
      periodText = `Up to ${formatEpochToDDMMYYYY(new Date(dashEndDate).getTime())}`;
    }

    // helper to format cartons and loose pieces
    const formatCartonAndLoose = (totalPcs: number, uom: number): string => {
      const cartons = Math.floor(totalPcs / uom);
      const loose = totalPcs % uom;
      if (cartons > 0 && loose > 0) {
        return `${cartons} ctn, ${loose} pcs`;
      } else if (cartons > 0) {
        return `${cartons} ctn`;
      } else {
        return `${loose} pcs`;
      }
    };

    // SECTION 1: Product Summary grouped by Brands
    // Columns: Brands, Product, Carton Given Qty Carton and Loose, Cost Value
    const brandGroups: Record<string, Array<{ productDisplay: string; totalPcs: number; cost: number; uom: number }>> = {};
    relevantTx.forEach(t => {
      const link = catalog.find(c => c.id === t.skuId);
      if (!link) return;
      const brand = link.brandName;
      if (!brandGroups[brand]) {
        brandGroups[brand] = [];
      }
      const productDisplay = `[${link.sku}] ${link.productName}`;
      const lineCost = t.qtyPcs * link.cost;

      let existing = brandGroups[brand].find(item => item.productDisplay === productDisplay);
      if (!existing) {
        existing = {
          productDisplay,
          totalPcs: 0,
          cost: 0,
          uom: link.uom
        };
        brandGroups[brand].push(existing);
      }
      existing.totalPcs += t.qtyPcs;
      existing.cost += lineCost;
    });

    let section1RowsHtml = "";
    let totalClaim = 0;

    Object.entries(brandGroups).forEach(([brandName, items]) => {
      // Brand header row
      section1RowsHtml += `
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="4" style="padding: 10px; font-size: 12px; color: #0f172a; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
            Brand: ${brandName}
          </td>
        </tr>
      `;

      let brandTotal = 0;
      items.forEach(item => {
        brandTotal += item.cost;
        totalClaim += item.cost;
        const cartonLooseStr = formatCartonAndLoose(item.totalPcs, item.uom);
        section1RowsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; font-size: 11px; color: #64748b; font-style: italic;">${brandName}</td>
            <td style="padding: 8px 10px; font-size: 12px; font-weight: 500;">${item.productDisplay}</td>
            <td style="padding: 8px 10px; font-size: 12px; text-align: right; font-weight: 600;">${cartonLooseStr}</td>
            <td style="padding: 8px 10px; font-size: 12px; text-align: right; font-weight: 500;">$${item.cost.toFixed(2)}</td>
          </tr>
        `;
      });

      // Brand subtotal row
      section1RowsHtml += `
        <tr style="font-weight: bold; background-color: #f8fafc;">
          <td colspan="3" style="padding: 8px 10px; font-size: 11px; text-align: right; color: #475569;">${brandName} Subtotal:</td>
          <td style="padding: 8px 10px; font-size: 12px; text-align: right; color: #0f172a;">$${brandTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    // SECTION 2: Particular details grouped by Doc (Ref) Number
    // Columns: Doc Number and Date | Receiver & Remark | Products | Qty | Cost
    // Small text font size 4-5px
    const docGroups: Record<string, { ref: string; date: number; receiverName: string; remark: string; items: Array<{ productDisplay: string; qtyPcs: number; cost: number }> }> = {};
    relevantTx.forEach(t => {
      const link = catalog.find(c => c.id === t.skuId);
      if (!link) return;
      const rec = receivers.find(r => r.id === t.receiverId);
      const receiverName = rec ? rec.name : "N/A";
      const productDisplay = `[${link.sku}] ${link.productName}`;
      const lineCost = t.qtyPcs * link.cost;

      if (!docGroups[t.ref]) {
        docGroups[t.ref] = {
          ref: t.ref,
          date: t.date,
          receiverName,
          remark: t.remark || "-",
          items: []
        };
      }
      docGroups[t.ref].items.push({
        productDisplay,
        qtyPcs: t.qtyPcs,
        cost: lineCost
      });
    });

    // Sort by date ascending to make a clear chronological audit trail
    const sortedDocGroups = Object.values(docGroups).sort((a, b) => a.date - b.date);

    let section2RowsHtml = "";
    sortedDocGroups.forEach(group => {
      group.items.forEach((item, index) => {
        const isFirst = index === 0;
        section2RowsHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9; font-size: 6px; font-family: monospace;">
            <td style="padding: 2px 4px; vertical-align: top; border-right: 1px solid #f1f5f9;">
              ${isFirst ? `<strong>${group.ref}</strong><br/><span style="color: #64748b;">${formatEpochToDDMMYYYY(group.date)}</span>` : ""}
            </td>
            <td style="padding: 2px 4px; vertical-align: top; border-right: 1px solid #f1f5f9; word-break: break-all; max-width: 150px;">
              ${isFirst ? `<strong>${group.receiverName}</strong><br/><span style="color: #64748b; font-style: italic;">${group.remark}</span>` : ""}
            </td>
            <td style="padding: 2px 4px; vertical-align: top; border-right: 1px solid #f1f5f9;">
              ${item.productDisplay}
            </td>
            <td style="padding: 2px 4px; vertical-align: top; text-align: right;">
              ${item.qtyPcs} pcs
            </td>
          </tr>
        `;
      });
    });

    const printHtml = `
      <html>
        <head>
          <title>Claim Statement - ${filterValue}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
            th { background-color: #f1f5f9; padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; text-align: left; }
            .section2-th { font-size: 8px; padding: 4px 6px; }
            .header-flex { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            .total-box { text-align: right; font-size: 18px; font-weight: bold; margin-top: 15px; border-top: 2px solid #e2e8f0; padding-top: 10px; }
            .section-title { font-size: 14px; font-weight: 800; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
            .subtext { font-size: 11px; color: #64748b; margin-top: 4px; }
            @media print {
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="header-flex">
            <div>
              <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">CLAIM STATEMENT</h2>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">HSG Global Pte Ltd</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #3b82f6;">${filterValue}</h3>
              <p class="subtext">Period: ${periodText}</p>
              <p class="subtext">Print Date: ${new Date().toLocaleDateString("en-GB")}</p>
            </div>
          </div>

          <!-- SECTION 1: Product Summary -->
          <div class="section-title">Product Summary</div>
          <table>
            <thead>
              <tr>
                <th>Brands</th>
                <th>Products</th>
                <th style="text-align: right;">Given</th>
                <th style="text-align: right;">Cost</th>
              </tr>
            </thead>
            <tbody>
              ${section1RowsHtml}
            </tbody>
          </table>

          <div class="total-box">
            Total Claim Amount: <span style="color: #3563e9;">$${totalClaim.toFixed(2)}</span>
          </div>

          <!-- Section 2 on new page -->
          <div class="page-break"></div>

          <!-- SECTION 2: Particular details -->
          <div class="section-title" style="margin-top: 20px;">Particular Claim Details</div>
          <p style="font-size: 8px; color: #64748b; margin-bottom: 8px;">Detailed audit logs of transactions grouped by Doc Number (Ref).</p>
          <table style="border: 1px solid #e2e8f0; width: 100%;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th class="section2-th" style="width: 25%;">Register Doc</th>
                <th class="section2-th" style="width: 30%;">Receiver</th>
                <th class="section2-th" style="width: 35%;">Products</th>
                <th class="section2-th" style="text-align: right; width: 10%;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${section2RowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 1000);
      }, 500);
    }
  };

  const uniqueCatalogBrands = React.useMemo(() => {
    return Array.from(new Set(catalog.map(c => c.brandName)));
  }, [catalog]);

  const uniqueCatalogSponsors = React.useMemo(() => {
    return Array.from(new Set(catalog.map(c => c.sponsoredBy).filter(Boolean)));
  }, [catalog]);

  const printSponsorOptions = React.useMemo(() => {
    const list = uniqueCatalogSponsors.map(sponsor => ({
      value: sponsor,
      label: sponsor
    }));
    return [{ value: "all", label: "All Sponsore" }, ...list];
  }, [uniqueCatalogSponsors]);

  // --- MEMOIZED SEARCHABLE SELECT DATA SOURCES ---
  const receiverOptions = React.useMemo(() => {
    return receivers.map(r => ({ value: r.id, label: `${r.name} (${r.type})` }));
  }, [receivers]);

  const filteredCatalog = React.useMemo(() => {
    if (!txSponsoredBy) return [];
    return catalog.filter(c => c.sponsoredBy === txSponsoredBy);
  }, [catalog, txSponsoredBy]);

  const catalogOptions = React.useMemo(() => {
    return filteredCatalog.map(c => ({
      value: c.id,
      label: c.sponsoredBy
        ? `[${c.sponsoredBy} - ${c.brandName}] ${c.sku} - ${c.productName}`
        : `[${c.brandName}] ${c.sku} - ${c.productName}`
    }));
  }, [filteredCatalog]);

  const brandOptions = React.useMemo(() => {
    return brandsList.map(b => ({ value: String(b.ID), label: b["Display Name"] }));
  }, [brandsList]);

  const productOptions = React.useMemo(() => {
    return filteredProductsSelect.map(p => ({ value: p.SKU, label: `${p.SKU} - ${p["Display Name"]}` }));
  }, [filteredProductsSelect]);

  // --- DATA TABLE COLUMNS & DATA SOURCES ---
  const transactionColumns: Column[] = React.useMemo(() => [
    { id: "sponsoredBy", header: "Sponsored By", accessor: "sponsoredBy" },
    { id: "date", header: "Date", accessor: "date_display" },
    { id: "ref", header: "Ref No.", accessor: "ref" },
    { id: "receiverName", header: "Receiver", accessor: "receiverName" },
    { id: "brandSku", header: "Brand & SKU", accessor: "brandSku" },
    { id: "qtyPcs", header: "Pcs", accessor: "qtyPcs" },
    { id: "totalAmount", header: "Total Amount", accessor: "totalAmount" },
    { id: "remark", header: "Remark", accessor: "remark" }
  ], []);

  const transactionsTableData = React.useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date - a.date)
      .map(tx => {
        const rec = receivers.find(r => r.id === tx.receiverId) || { name: "Unknown" };
        const link = catalog.find(c => c.id === tx.skuId) || { brandName: "Unknown", sku: "N/A", uom: 1, cost: 0, sponsoredBy: "" };
        const totalAmount = tx.qtyPcs * link.cost;
        return {
          ...tx,
          id: tx.id,
          sponsoredBy: link.sponsoredBy || "-",
          date_display: formatEpochToDDMMYYYY(tx.date),
          date_display_raw: tx.date, // for sorting
          ref: tx.ref,
          receiverName: rec.name,
          brandSku: link.sponsoredBy 
            ? `[${link.sponsoredBy} - ${link.brandName}] ${link.sku}`
            : `[${link.brandName}] ${link.sku}`,
          qtyPcs: tx.qtyPcs,
          totalAmount: `$${totalAmount.toFixed(2)}`,
          totalAmount_raw: totalAmount, // for sorting
          remark: tx.remark || "-"
        };
      });
  }, [transactions, receivers, catalog]);

  const dashboardColumns: Column[] = React.useMemo(() => [
    { id: "sponsoredBy", header: "Sponsored By", accessor: "sponsoredBy" },
    { id: "brand", header: "Brand Name", accessor: "brand" },
    { id: "skuCode", header: "SKU", accessor: "skuCode" },
    { id: "skuName", header: "Product Name", accessor: "skuName" },
    { id: "given", header: "Given", accessor: "given" },
    { id: "cost", header: "Est. Cost Value", accessor: "cost" }
  ], []);

  const dashboardTableData = React.useMemo(() => {
    return dashboardStats.summaryList.map((item, idx) => {
      const uom = item.uom || 24;
      const cartons = Math.floor(item.qtyPcs / uom);
      const pcs = item.qtyPcs % uom;
      
      let givenText = "";
      if (cartons === 0 && pcs === 0) {
        givenText = "0 Carton";
      } else if (cartons > 0 && pcs === 0) {
        givenText = `${cartons} Carton`;
      } else if (cartons === 0 && pcs > 0) {
        givenText = `${pcs} Pcs`;
      } else {
        givenText = `${cartons} Carton and ${pcs} Pcs`;
      }

      return {
        id: idx,
        sponsoredBy: item.sponsoredBy || "-",
        brand: item.brand,
        skuCode: item.skuCode,
        skuName: item.skuName,
        given: givenText,
        given_raw: item.qtyPcs, // for sorting
        cost: `$${item.cost.toFixed(2)}`,
        cost_raw: item.cost // for sorting
      };
    });
  }, [dashboardStats.summaryList]);

  const catalogColumns: Column[] = React.useMemo(() => [
    { id: "sponsoredBy", header: "Sponsored By", accessor: "sponsoredBy" },
    { id: "brandName", header: "Brands", accessor: "brandName" },
    { id: "sku", header: "SKU", accessor: "sku" },
    { id: "productName", header: "Product Name", accessor: "productName" },
    { id: "uom", header: "UOM (Pcs/Ctn)", accessor: "uom" },
    { id: "cost", header: "Cost/Pc", accessor: "cost" },
    { id: "costCtn", header: "Cost/Ctn", accessor: "costCtn" }
  ], []);

  const catalogTableData = React.useMemo(() => {
    return catalog.map(item => ({
      ...item,
      id: item.id,
      sponsoredBy: item.sponsoredBy || "-",
      brandName: item.brandName,
      sku: item.sku,
      productName: item.productName,
      uom: item.uom,
      cost: `$${item.cost.toFixed(2)}`,
      cost_raw: item.cost, // for sorting
      costCtn: `$${(item.cost * item.uom).toFixed(2)}`,
      costCtn_raw: item.cost * item.uom // for sorting
    }));
  }, [catalog]);

  const receiverColumns: Column[] = React.useMemo(() => [
    { id: "name", header: "Entity Name", accessor: "name" },
    { id: "type_display", header: "Limit Type", accessor: "type_display" },
    { id: "limit", header: "Limit (Ctns)", accessor: "limit" },
    { id: "given", header: "Given (Ctns)", accessor: "given" },
    { id: "balance", header: "Balance (Ctns)", accessor: "balance" },
    { id: "status", header: "Status", accessor: "status" }
  ], []);

  const receiversTableData = React.useMemo(() => {
    return receivers.map(rec => {
      const given = calculateGivenCartons(rec.id, rec.type);
      const isLimited = rec.type !== "open";
      const balance = isLimited ? (rec.limit! - given) : null;
      
      let statusBadge = "";
      let statusText = "Open";
      if (isLimited) {
        if (balance! <= 0) {
          statusBadge = "bg-red-100 text-red-800 border-red-200";
          statusText = "Limit Reached";
        } else if (balance! <= (rec.limit! * 0.2)) {
          statusBadge = "bg-amber-100 text-amber-800 border-amber-200";
          statusText = "Near Limit";
        } else {
          statusBadge = "bg-green-100 text-green-800 border-green-200";
          statusText = "Active";
        }
      } else {
        statusBadge = "bg-blue-100 text-blue-800 border-blue-200";
      }

      const badgeElement = (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${statusBadge}`}>
          {statusText}
        </span>
      );

      return {
        ...rec,
        id: rec.id,
        name: rec.name,
        type_display: rec.type === "monthly" ? "Monthly" : rec.type === "onetime" ? "One-Time Take" : "Open",
        type_display_raw: rec.type, // for sorting
        limit: isLimited ? rec.limit : "∞",
        limit_raw: isLimited ? rec.limit : Infinity,
        given: given.toFixed(1),
        given_raw: given,
        balance: isLimited ? balance!.toFixed(1) : "∞",
        balance_raw: isLimited ? balance : Infinity,
        status: badgeElement,
        status_raw: statusText // for sorting
      };
    });
  }, [receivers, transactions, catalog]);

  return (
    <div className="flex flex-col gap-6 font-primary text-zinc-900 select-none">
      
      {/* Navigation sub-tabs */}
      <NavigationTabs 
        tabs={tabs} 
        activeTabId={activeTab} 
        onTabSelect={(id) => setActiveTab(id)} 
        action={
          activeTab === "dashboard" ? (
            <div className="flex items-center gap-3">
              {(dashStartDate || dashEndDate || dashSponsorFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setDashStartDate("");
                    setDashEndDate("");
                    setDashSponsorFilter("all");
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline font-semibold transition-colors cursor-pointer whitespace-nowrap mr-1"
                  title="Clear range filter"
                >
                  Clear Filter
                </button>
              )}
              <div className="w-52 text-xs">
                <SearchableSelect
                  options={printSponsorOptions}
                  value={dashSponsorFilter}
                  onChange={(val) => setDashSponsorFilter(val || "all")}
                  placeholder="Select Sponsor..."
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
                <span>Range</span>
                <input
                  type="date"
                  value={dashStartDate}
                  onChange={(e) => setDashStartDate(e.target.value)}
                  className="bg-white border border-zinc-300 rounded-lg p-1.5 font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
                />
                <span className="mx-0.5 text-zinc-400 font-normal text-sm">-</span>
                <input
                  type="date"
                  value={dashEndDate}
                  onChange={(e) => setDashEndDate(e.target.value)}
                  className="bg-white border border-zinc-300 rounded-lg p-1.5 font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
                />
              </div>
              <CustomButton 
                onClick={handlePrintClaim}
                variant="default"
              >
                <Printer size={13} className="text-zinc-500" />
                Print Claim
              </CustomButton>
            </div>
          ) : undefined
        }
      />

      {/* 1. DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6 animate-tableFadeInOnly">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-[#F0F4F9] text-[#041E49] rounded border border-transparent">
                <TrendingUp size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cartons Distributed</p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5">{Math.round(dashboardStats.totalCartons)}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-[#F0F4F9] text-[#041E49] rounded border border-transparent">
                <FileText size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Transactions</p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5">{dashboardStats.totalTransactions}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-[#F0F4F9] text-[#041E49] rounded border border-transparent">
                <Users size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Registered Receivers</p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5">{receivers.length}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-[#F0F4F9] text-[#041E49] rounded border border-transparent">
                <Coins size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Est. Value (Cost)</p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5">${dashboardStats.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Recent Summary table */}
          <div className="overflow-hidden flex flex-col">
            <DataTable
              columns={dashboardColumns}
              data={dashboardTableData}
              userRole={userRole}
              title="Sponsore Summary"
              fetching={fetching}
              height="h-[calc(100vh-340px)]"
            />
          </div>
        </div>
      )}

      {/* 2. TRANSACTION LOGGING TAB */}
      {activeTab === "transaction" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-tableFadeInOnly">
            {/* History table col (left side) */}
            <div className={`${isTxFormOpen ? "lg:col-span-2" : "lg:col-span-3"} overflow-hidden flex flex-col`}>
              <DataTable
                columns={transactionColumns}
                data={transactionsTableData}
                userRole={userRole}
                title="Distribution Log History"
                fetching={fetching}
                onEditRow={(row) => handleEditTransaction(row.id)}
                onDeleteRow={(id) => handleDeleteTransaction(id)}
                height="h-[calc(100vh-240px)]"
                headerActions={
                  <CustomButton
                    variant={isTxFormOpen ? "dark" : "default"}
                    onClick={() => setIsTxFormOpen(!isTxFormOpen)}
                  >
                    {isTxFormOpen ? "Hide Panel" : "Add New Record"}
                  </CustomButton>
                }
              />
            </div>

            {/* Form col (right side, collapsible) */}
            {isTxFormOpen && (
              <div className="lg:col-span-1 bg-white border border-zinc-300/40 p-5 rounded-xl shadow-sm h-fit">
                <h3 className="font-bold text-zinc-900 border-b pb-2 text-sm uppercase tracking-wider">
                  {txId ? "Edit Entry" : "Log Output Entry"}
                </h3>
                <form onSubmit={handleTransactionSubmit} className="flex flex-col gap-4 mt-4 text-xs">
                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Sponsored By</label>
                    <select
                      value={txSponsoredBy}
                      onChange={(e) => {
                        const newSponsor = e.target.value;
                        if (txItems.length > 0) {
                          if (confirm("Changing the sponsor will clear the currently added SKUs. Do you want to proceed?")) {
                            setTxSponsoredBy(newSponsor);
                            setTxSkuId("");
                            setTxItems([]);
                          }
                        } else {
                          setTxSponsoredBy(newSponsor);
                          setTxSkuId("");
                        }
                      }}
                      required
                      disabled={userRole === "viewer"}
                      className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 font-semibold focus:outline-none focus:border-blue-400 h-10"
                    >
                      <option value="" disabled>Select Sponsor...</option>
                      {uniqueCatalogSponsors.map(sponsor => (
                        <option key={sponsor} value={sponsor}>{sponsor}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-zinc-500 font-bold uppercase">Ref Number</label>
                      <input 
                        type="text" 
                        value={txRef}
                        onChange={(e) => setTxRef(e.target.value)}
                        placeholder="e.g. DOC-8823"
                        required
                        disabled={userRole === "viewer"}
                        className="w-full bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-zinc-500 font-bold uppercase">Date</label>
                      <input 
                        type="date" 
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        required
                        disabled={userRole === "viewer"}
                        className="w-full bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Receiver Entity</label>
                    <SearchableSelect
                      options={receiverOptions}
                      value={txReceiverId}
                      onChange={(val) => setTxReceiverId(val)}
                      placeholder="Search and select receiver..."
                      disabled={userRole === "viewer"}
                    />
                    {txReceiverId && (
                      <p className={`text-[10px] mt-1.5 font-bold ${currentBalanceStatus.warningClass || "text-zinc-500"}`}>
                        {currentBalanceStatus.msg}
                      </p>
                    )}
                  </div>

                  {/* SKU Items List section */}
                  <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 mt-1 flex flex-col gap-3">
                    <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider block">Add SKUs to Transaction</span>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block mb-1 text-[10px] text-zinc-500 font-semibold uppercase">Sku</label>
                        <SearchableSelect
                          options={catalogOptions}
                          value={txSkuId}
                          onChange={(val) => setTxSkuId(val)}
                          placeholder={txSponsoredBy ? "Search SKU..." : "Select sponsor first..."}
                          disabled={userRole === "viewer" || !txSponsoredBy}
                        />
                      </div>
                      <div className="w-24">
                        <label className="block mb-1 text-[10px] text-zinc-500 font-semibold uppercase">Qty (Pcs)</label>
                        <input 
                          type="number" 
                          value={txQty}
                          onChange={(e) => setTxQty(e.target.value)}
                          placeholder="Pcs"
                          min={1}
                          disabled={userRole === "viewer"}
                          className="w-full h-8 bg-white border border-zinc-300 rounded-lg px-2 text-zinc-900 focus:outline-none text-xs"
                        />
                      </div>
                      {userRole !== "viewer" && (
                        <Plus 
                          size={20} 
                          onClick={handleAddItemToList}
                          className="cursor-pointer text-zinc-500 hover:text-zinc-900 transition-colors flex-shrink-0 mb-1.5"
                        />
                      )}
                    </div>

                    {txItems.length > 0 && (
                      <div className="mt-2 border-t border-zinc-200 pt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                        {txItems.map((item, idx) => {
                          const link = catalog.find(c => c.id === item.skuId);
                          const code = link ? link.sku : "N/A";
                          const itemCost = link ? link.cost : 0;
                          const totalAmount = item.qtyPcs * itemCost;
                          return (
                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-zinc-200 text-[11px] font-medium">
                              <div className="truncate pr-2">
                                <span className="font-bold text-zinc-900">{code}</span>
                                <span className="text-zinc-500 ml-1.5">({item.qtyPcs} pcs / ${totalAmount.toFixed(2)})</span>
                              </div>
                              {userRole !== "viewer" && (
                                <Trash2 
                                  size={14} 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setTxItems(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="text-zinc-400 hover:text-red-600 cursor-pointer flex-shrink-0 transition-colors"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Remark</label>
                    <textarea 
                      rows={3}
                      value={txRemark}
                      onChange={(e) => setTxRemark(e.target.value)}
                      placeholder="Optional notes"
                      disabled={userRole === "viewer"}
                      className="w-full bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold resize-none text-xs"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <CustomButton 
                      type="submit"
                      disabled={txItems.length === 0 || userRole === "viewer"}
                      variant={txId ? "secondary" : "dark"}
                      className="flex-1 h-10"
                    >
                      {userRole === "viewer" ? "View Only" : txId ? "Update Entry" : "Record Entry"}
                    </CustomButton>
                    {txId && (
                      <CustomButton 
                        type="button" 
                        onClick={handleCancelTxEdit}
                        variant="default"
                        className="h-10"
                      >
                        Cancel
                      </CustomButton>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SPONSORED BY TAB */}
      {activeTab === "sponsored" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-tableFadeInOnly">
            {/* Table col (left side) */}
            <div className={`${isCatalogFormOpen ? "lg:col-span-2" : "lg:col-span-3"} overflow-hidden flex flex-col`}>
              <DataTable
                columns={catalogColumns}
                data={catalogTableData}
                userRole={userRole}
                title="Sponsored Catalog Mappings"
                fetching={fetching}
                onEditRow={(row) => handleEditCatalog(row)}
                onDeleteRow={(id) => handleDeleteCatalog(id)}
                height="h-[calc(100vh-240px)]"
                headerActions={
                  <CustomButton
                    variant={isCatalogFormOpen ? "dark" : "default"}
                    onClick={() => setIsCatalogFormOpen(!isCatalogFormOpen)}
                  >
                    {isCatalogFormOpen ? "Hide Panel" : "Add New Record"}
                  </CustomButton>
                }
              />
            </div>

            {/* Form col (right side, collapsible) */}
            {isCatalogFormOpen && (
              <div className="lg:col-span-1 bg-white border border-zinc-300/40 p-5 rounded-xl shadow-sm h-fit">
                <h3 className="font-bold text-zinc-900 border-b pb-2 text-sm uppercase tracking-wider">
                  {sponsoredCatalogId ? "Edit Sponsored Product" : "Add Sponsored Product"}
                </h3>
                <form onSubmit={handleAddCatalog} className="flex flex-col gap-4 mt-4 text-xs">
                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Sponsored By</label>
                    <input 
                      type="text" 
                      value={sponsoredBy}
                      onChange={(e) => setSponsoredBy(e.target.value)}
                      placeholder="e.g. HSG Global"
                      required
                      disabled={userRole === "viewer"}
                      className="w-full bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Brands</label>
                    <SearchableSelect
                      options={brandOptions}
                      value={selectedBrand}
                      onChange={(val) => {
                        setSelectedBrand(val);
                        setSelectedProductSku("");
                      }}
                      placeholder="Search and select brand..."
                      disabled={userRole === "viewer"}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Product SKU</label>
                    <SearchableSelect
                      options={productOptions}
                      value={selectedProductSku}
                      onChange={(val) => setSelectedProductSku(val)}
                      disabled={!selectedBrand || userRole === "viewer"}
                      placeholder={selectedBrand ? "Search product SKU..." : "Select Brand first"}
                    />
                  </div>
                  {selectedProductSku && (
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 flex flex-col gap-2 font-medium">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-bold text-[10px]">UOM (Pieces/Ctn)</span>
                        <span className="font-bold text-zinc-900">
                          {productsList.find(p => p.SKU === selectedProductSku)?.Carton || 24} pcs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-bold text-[10px]">Cost per Piece</span>
                        <span className="font-bold text-zinc-900">
                          ${parseFloat(productsList.find(p => p.SKU === selectedProductSku)?.Cost || "0").toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-bold text-[10px]">Cost per Carton</span>
                        <span className="font-bold text-zinc-900">
                          ${(parseFloat(productsList.find(p => p.SKU === selectedProductSku)?.Cost || "0") * parseInt(productsList.find(p => p.SKU === selectedProductSku)?.Carton || "24")).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <CustomButton 
                      type="submit"
                      disabled={userRole === "viewer"}
                      variant={sponsoredCatalogId ? "secondary" : "dark"}
                      className="flex-1 h-10"
                    >
                      {userRole === "viewer" ? "View Only" : sponsoredCatalogId ? "Update Catalog" : "Add to Catalog"}
                    </CustomButton>
                    {sponsoredCatalogId && (
                      <CustomButton 
                        type="button" 
                        onClick={handleCancelCatalogEdit}
                        variant="default"
                        className="h-10"
                      >
                        Cancel
                      </CustomButton>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 4. RECEIVER REGISTRY TAB */}
      {activeTab === "receiver" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-tableFadeInOnly">
            {/* Table col (left side) */}
            <div className={`${isReceiverFormOpen ? "lg:col-span-2" : "lg:col-span-3"} overflow-hidden flex flex-col`}>
              <DataTable
                columns={receiverColumns}
                data={receiversTableData}
                userRole={userRole}
                title="Receiver Registry and Statuses"
                fetching={fetching}
                onEditRow={(row) => handleEditReceiver(row)}
                onDeleteRow={(id) => handleDeleteReceiver(id)}
                height="h-[calc(100vh-240px)]"
                headerActions={
                  <CustomButton
                    variant={isReceiverFormOpen ? "dark" : "default"}
                    onClick={() => setIsReceiverFormOpen(!isReceiverFormOpen)}
                  >
                    {isReceiverFormOpen ? "Hide Panel" : "Add New Record"}
                  </CustomButton>
                }
              />
            </div>

            {/* Form col (right side, collapsible) */}
            {isReceiverFormOpen && (
              <div className="lg:col-span-1 bg-white border border-zinc-300/40 p-5 rounded-xl shadow-sm h-fit">
                <h3 className="font-bold text-zinc-900 border-b pb-2 text-sm uppercase tracking-wider">
                  {recId ? "Edit Entity" : "Register Entity"}
                </h3>
                <form onSubmit={handleAddReceiver} className="flex flex-col gap-4 mt-4 text-xs">
                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Entity Name</label>
                    <input 
                      type="text" 
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      placeholder="e.g. Red Cross Charity"
                      required
                      disabled={userRole === "viewer"}
                      className="w-full bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-zinc-500 font-bold uppercase">Limit Type</label>
                    <select
                      value={recType}
                      onChange={(e) => setRecType(e.target.value as any)}
                      required
                      disabled={userRole === "viewer"}
                      className="w-full bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 font-semibold focus:outline-none focus:border-blue-400"
                    >
                      <option value="monthly">Monthly Limit</option>
                      <option value="onetime">One-Time Take</option>
                      <option value="open">Open (No Limit)</option>
                    </select>
                  </div>
                  {recType !== "open" && (
                    <div>
                      <label className="block mb-1 text-zinc-500 font-bold uppercase">Limit (in Cartons)</label>
                      <input 
                        type="number" 
                        value={recLimit}
                        onChange={(e) => setRecLimit(e.target.value)}
                        placeholder="Maximum cartons allowed"
                        required
                        min={1}
                        disabled={userRole === "viewer"}
                        className="w-full bg-[#F0F4F9] border border-slate-200 rounded p-2.5 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                      />
                      <p className="text-[10px] text-zinc-400 font-medium mt-1">
                        Transactions are logged in pieces, but limits are tracked in cartons.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <CustomButton 
                      type="submit"
                      disabled={userRole === "viewer"}
                      variant={recId ? "secondary" : "dark"}
                      className="flex-1 h-10"
                    >
                      {userRole === "viewer" ? "View Only" : recId ? "Update Entity" : "Register Entity"}
                    </CustomButton>
                    {recId && (
                      <CustomButton 
                        type="button" 
                        onClick={handleCancelReceiverEdit}
                        variant="default"
                        className="h-10"
                      >
                        Cancel
                      </CustomButton>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}



    </div>
  );
}
