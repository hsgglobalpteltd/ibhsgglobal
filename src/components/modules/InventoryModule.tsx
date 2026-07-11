"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { Eye, User, Calendar, ClipboardCheck, X, FileText, CheckCircle2, AlertCircle, Layers, History, Search, Printer } from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { NavigationTabs } from "../navigation-tabs";

interface InventoryModuleProps {
  profile?: {
    role: string;
    modules_access: string[];
  } | null;
}

interface StockTakeItem {
  sku: string;
  qty: number;
  skipped: boolean;
}

interface ParsedLog {
  id: string;
  timestamp: number;
  dateStr: string;
  auditorId: string;
  itemsCount: number;
  items: StockTakeItem[];
}

export function InventoryModule({ profile }: InventoryModuleProps) {
  const [logs, setLogs] = React.useState<ParsedLog[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"idle" | "syncing" | "synced">("idle");
  const [selectedLog, setSelectedLog] = React.useState<ParsedLog | null>(null);

  // Sub-tabs: "stock" or "logs"
  const [subTab, setSubTab] = React.useState<"stock" | "logs">("stock");

  // Filters state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchAuditor, setSearchAuditor] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [selectedBrand, setSelectedBrand] = React.useState("all");

  const tabsListItems = React.useMemo(() => [
    { id: "stock", label: "Current Stock Levels" },
    { id: "logs", label: "Audit Logs History" }
  ], []);

  // Get latest log date formatted as dd/mm/yyyy
  const latestLogDateStr = React.useMemo(() => {
    if (logs.length === 0) return "";
    const date = new Date(logs[0].timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, [logs]);

  // Helper to format date to dd/mm/yyyy hh:mm
  const formatDateTime = (epoch: number) => {
    if (!epoch) return "N/A";
    const date = new Date(epoch);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Helper to lookup user details by ID/PIN/code
  const lookupUser = React.useCallback((userId: string) => {
    if (!userId || userId === "Unknown") return "Unknown";
    const user = users.find(u => String(u.ID || u.id || u.PIN || u.pin || "").trim().toLowerCase() === String(userId).trim().toLowerCase());
    return user ? (user.Name || user.name || userId) : userId;
  }, [users]);

  // Helper to lookup product details by SKU
  const lookupProduct = React.useCallback((sku: string) => {
    const prod = products.find(p => String(p.SKU || p.sku || p.Code || "").trim().toLowerCase() === String(sku).trim().toLowerCase());
    if (prod) {
      const brandId = prod["Brands ID"] || prod.Brands_ID || prod.brandId || "";
      const brandObj = brands.find(b => String(b.ID || b.id || "").trim() === String(brandId).trim());
      const brandName = brandObj ? (brandObj["Display Name"] || brandObj.Display_Name || brandObj.name || brandId) : "Unbranded";

      return {
        name: prod["Display Name"] || prod.Display_Name || prod.productName || prod.Name || "Unknown Product",
        brand: brandName,
        uom: Number(prod.Carton || prod.uom || prod.UOM) || 1
      };
    }
    return { name: "Unknown Product", brand: "N/A", uom: 1 };
  }, [products, brands]);

  // Reusable parser to parse raw logs row items case-insensitively
  const parseLogs = React.useCallback((rawData: any[]): ParsedLog[] => {
    return rawData.map((row: any, index: number) => {
      // Find keys case-insensitively
      const auditKey = Object.keys(row).find(k => k.trim().toLowerCase() === "audit");
      const timestampKey = Object.keys(row).find(k => k.trim().toLowerCase() === "timestamp");
      const auditByKey = Object.keys(row).find(k => k.trim().toLowerCase() === "audit by");

      const rawAudit = auditKey ? row[auditKey] : null;
      const rawTimestamp = timestampKey ? row[timestampKey] : null;
      const rawAuditBy = auditByKey ? row[auditByKey] : null;

      let items: StockTakeItem[] = [];
      try {
        if (rawAudit) {
          const parsedAudit = typeof rawAudit === "string" ? JSON.parse(rawAudit) : rawAudit;
          if (Array.isArray(parsedAudit)) {
            items = parsedAudit.map((item: any) => {
              const skuKey = Object.keys(item).find(k => k.trim().toLowerCase() === "sku") || "sku";
              const qtyKey = Object.keys(item).find(k => k.trim().toLowerCase() === "qty") || "qty";
              const skippedKey = Object.keys(item).find(k => k.trim().toLowerCase() === "skipped") || "skipped";

              return {
                sku: String(item[skuKey] || "").trim(),
                qty: Number(item[qtyKey]) || 0,
                skipped: !!item[skippedKey]
              };
            });
          }
        }
      } catch (e) {
        console.warn("Failed to parse Audit items", e);
      }

      const epoch = Number(rawTimestamp) || Date.now();

      return {
        id: String(rawTimestamp || index),
        timestamp: epoch,
        dateStr: formatDateTime(epoch),
        auditorId: String(rawAuditBy || "Unknown").trim(),
        itemsCount: items.length,
        items
      };
    });
  }, []);

  const fetchFreshData = async (forceSync = false) => {
    setFetching(true);
    if (forceSync) {
      setSyncStatus("syncing");
    }

    try {
      // 1. Fetch Brands list for brand name lookups
      let cachedBrands = localStorage.getItem("brands_DB_data");
      let brandList = [];
      if (cachedBrands) {
        brandList = JSON.parse(cachedBrands);
        setBrands(brandList);
      } else {
        const brandRes = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=brands_DB");
        if (brandRes.ok) {
          brandList = await brandRes.json();
          localStorage.setItem("brands_DB_data", JSON.stringify(brandList));
          setBrands(brandList);
        }
      }

      // 2. Fetch Products database for SKU name lookups
      let cachedProds = localStorage.getItem("products_DB_data");
      let prodList = [];
      if (cachedProds) {
        prodList = JSON.parse(cachedProds);
        setProducts(prodList);
      } else {
        const prodRes = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=products_DB");
        if (prodRes.ok) {
          prodList = await prodRes.json();
          localStorage.setItem("products_DB_data", JSON.stringify(prodList));
          setProducts(prodList);
        }
      }

      // 3. Fetch Users mapping table (Stock_Take_Users)
      const usersSheet = "Stock_Take_Users";
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${usersSheet}`, {
          method: "POST"
        });
      }
      const usersRes = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${usersSheet}`);
      if (usersRes.ok) {
        const userList = await usersRes.json();
        localStorage.setItem(`${usersSheet}_data`, JSON.stringify(userList));
        setUsers(userList);
      }

      // 4. Fetch Stock Take Logs
      const logsSheet = "Stock_Take_Log";
      if (forceSync) {
        const syncRes = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${logsSheet}`, {
          method: "POST"
        });
        if (!syncRes.ok) throw new Error("Failed to refresh server cache");
      }

      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${logsSheet}`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const rawData = await res.json();
      
      localStorage.setItem(`${logsSheet}_data`, JSON.stringify(rawData));

      // Parse logs
      const parsed = parseLogs(rawData);
      // Sort logs descending (most recent first)
      parsed.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(parsed);

      if (forceSync) {
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to fetch stock data: " + err.message, "error");
      setSyncStatus("idle");
    } finally {
      setFetching(false);
    }
  };

  // Load cached data on mount, otherwise fetch fresh
  React.useEffect(() => {
    // A. Load brands
    const cachedBrands = localStorage.getItem("brands_DB_data");
    if (cachedBrands) {
      setBrands(JSON.parse(cachedBrands));
    }

    // B. Load products
    const cachedProds = localStorage.getItem("products_DB_data");
    if (cachedProds) {
      setProducts(JSON.parse(cachedProds));
    }

    // C. Load users
    const cachedUsers = localStorage.getItem("Stock_Take_Users_data");
    if (cachedUsers) {
      setUsers(JSON.parse(cachedUsers));
    }

    // D. Load logs
    const cachedLogs = localStorage.getItem("Stock_Take_Log_data");
    if (cachedLogs) {
      try {
        const rawData = JSON.parse(cachedLogs);
        const parsed = parseLogs(rawData);
        parsed.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(parsed);
      } catch (e) {
        fetchFreshData(false);
      }
    } else {
      fetchFreshData(false);
    }

    // Trigger fresh load if caches are not present
    if (!cachedProds || !cachedUsers || !cachedBrands) {
      fetchFreshData(false);
    }
  }, [parseLogs]);

  // Listen for the global db-refresh event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await fetchFreshData(true);
      showToast("Inventory log refreshed!", "success");
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, []);

  // Compute Brand list for dropdown filter
  const brandsList = React.useMemo(() => {
    const set = new Set<string>();
    brands.forEach(b => {
      const name = b["Display Name"] || b.name || b.ID;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [brands]);

  // Compute Current Stock levels: products grouped by brand, with latest stock take quantity
  const currentStockLevels = React.useMemo(() => {
    // 1. Map SKU -> latest count info (newest count overrides older count)
    const latestCounts: Record<string, { qty: number; timestamp: number; dateStr: string; auditorId: string; skipped: boolean }> = {};

    // Sort logs oldest to newest so that newer ones overwrite older ones
    const sortedLogsAsc = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    sortedLogsAsc.forEach(log => {
      log.items.forEach(item => {
        if (item.sku) {
          const normSku = String(item.sku).trim().toLowerCase();
          latestCounts[normSku] = {
            qty: item.qty,
            timestamp: log.timestamp,
            dateStr: log.dateStr,
            auditorId: log.auditorId,
            skipped: item.skipped
          };
        }
      });
    });

    // 2. Group products by brand
    const groups: Record<string, Array<{
      sku: string;
      name: string;
      uom: number;
      qty: number;
      dateStr: string;
      auditor: string;
      hasRecord: boolean;
      skipped: boolean;
    }>> = {};

    products.forEach(p => {
      const rawSku = p.SKU || p.sku || p.Code || "";
      const sku = String(rawSku).trim();
      const normSku = sku.toLowerCase();

      // Resolve Brand Name from Brands ID using brands_DB
      const brandId = p["Brands ID"] || p.Brands_ID || p.brandId || "";
      const brandObj = brands.find(b => String(b.ID || b.id || "").trim() === String(brandId).trim());
      const brand = brandObj ? (brandObj["Display Name"] || brandObj.Display_Name || brandObj.name || brandId) : "Unbranded";

      const name = p["Display Name"] || p.productName || p.Name || "Unknown Product";
      const uom = Number(p.Carton || p.uom || p.UOM) || 1;

      // Filter by search query if present
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSku = sku.toLowerCase().includes(query);
        const matchesName = name.toLowerCase().includes(query);
        if (!matchesSku && !matchesName) return;
      }

      // Filter by brand if selected
      if (selectedBrand !== "all" && brand !== selectedBrand) {
        return;
      }

      const count = latestCounts[normSku];

      if (!groups[brand]) {
        groups[brand] = [];
      }

      groups[brand].push({
        sku,
        name,
        uom,
        qty: count ? count.qty : 0,
        dateStr: count ? count.dateStr : "N/A",
        auditor: count ? lookupUser(count.auditorId) : "N/A",
        hasRecord: !!count,
        skipped: count ? count.skipped : false
      });
    });

    return groups;
  }, [logs, products, brands, searchQuery, selectedBrand, lookupUser]);

  // Filter logs based on inputs (for history tab)
  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const auditorName = lookupUser(log.auditorId);
      if (searchAuditor && !auditorName.toLowerCase().includes(searchAuditor.toLowerCase())) {
        return false;
      }
      if (startDate) {
        const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
        if (log.timestamp < filterStart) return false;
      }
      if (endDate) {
        const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);
        if (log.timestamp > filterEnd) return false;
      }
      return true;
    });
  }, [logs, searchAuditor, startDate, endDate, lookupUser]);

  const columns: Column[] = [
    { id: "dateStr", header: "Audit Date/Time", accessor: "dateStr" },
    { id: "auditor", header: "Audited By", accessor: "auditor" },
    { id: "itemsCount", header: "Unique SKU Counted", accessor: "itemsCount" },
    { id: "actions", header: "Action", accessor: "actions" }
  ];

  const logsTableData = React.useMemo(() => {
    return filteredLogs.map(log => ({
      id: log.id,
      dateStr: log.dateStr,
      auditor: lookupUser(log.auditorId),
      itemsCount: log.itemsCount,
      actions: (
        <button
          type="button"
          onClick={() => setSelectedLog(log)}
          className="hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 font-bold cursor-pointer text-blue-600 bg-transparent border-0 p-0 focus:outline-none text-[11px]"
        >
          <Eye size={13} className="text-blue-500" />
          <span>View Details</span>
        </button>
      )
    }));
  }, [filteredLogs, lookupUser]);

  // Print function helper matching the provided template layout exactly
  const generatePrintReport = (auditorName: string, auditDate: string, stockLevels: typeof currentStockLevels) => {
    const brandSectionsHtml = Object.entries(stockLevels).map(([brandName, brandItems]) => {
      const rowsHtml = brandItems.map(item => {
        const cartons = Math.floor(item.qty / item.uom);
        const loose = item.qty % item.uom;
        let displayCartonLoose = "-";
        if (item.hasRecord && !item.skipped) {
          if (cartons > 0 && loose > 0) {
            displayCartonLoose = `${cartons}ctn ${loose}pcs`;
          } else if (cartons > 0) {
            displayCartonLoose = `${cartons}ctn`;
          } else {
            displayCartonLoose = `${loose}pcs`;
          }
        }

        const stockQtyText = item.skipped 
          ? `<span class="skipped-badge">Skipped</span>` 
          : item.hasRecord 
            ? `<span class="qty-text">${item.qty} pcs</span>` 
            : `<span class="no-record">No count</span>`;

        const cartonLooseText = item.skipped 
          ? `<span class="no-record">-</span>` 
          : item.hasRecord 
            ? `<span style="font-weight:700; color:#334155;">${displayCartonLoose}</span>` 
            : `<span class="no-record">-</span>`;

        return `
          <tr>
            <td style="font-weight:700; color:#475569;">${item.sku}</td>
            <td style="font-weight:600; color:#0F172A;">${item.name}</td>
            <td class="right-align">${stockQtyText}</td>
            <td class="right-align">${cartonLooseText}</td>
          </tr>
        `;
      }).join("");

      return `
        <div class="brand-section">
          <div class="brand-header">
            <h2 class="brand-title">${brandName}</h2>
            <span class="product-count">${brandItems.length} ${brandItems.length === 1 ? "Product" : "Products"}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">SKU</th>
                <th style="width: 45%;">Description</th>
                <th style="width: 17%;" class="right-align">Current Stock</th>
                <th style="width: 18%;" class="right-align">Carton/Loose</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }).join("");

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HSG Global Stock Take Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            padding: 20mm;
            margin: 0;
            background-color: #ffffff;
            line-height: 1.5;
          }
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0B57D0;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .title-area h1 {
            font-size: 24px;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 5px 0;
          }
          .title-area p {
            font-size: 12px;
            color: #64748B;
            margin: 0;
            font-weight: 500;
          }
          .brand-logo {
            font-size: 16px;
            font-weight: 800;
            color: #0B57D0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 13px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .meta-label {
            color: #64748B;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-value {
            color: #0F172A;
            font-weight: 700;
          }
          .brand-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .brand-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .brand-title {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0F172A;
            margin: 0;
            border-left: 3px solid #0B57D0;
            padding-left: 8px;
          }
          .product-count {
            font-size: 10px;
            font-weight: 700;
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            color: #475569;
            padding: 2px 8px;
            border-radius: 20px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 10px;
          }
          th, td {
            padding: 8px 12px;
            font-size: 11px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
          }
          tr:last-child td {
            border-bottom: none;
          }
          th:last-child, td:last-child {
            border-right: none;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
          }
          th.right-align, td.right-align {
            text-align: right;
          }
          .qty-text {
            color: #0B57D0;
            font-weight: 700;
          }
          .skipped-badge {
            display: inline-block;
            background-color: #fef3c7;
            border: 1px solid #fde68a;
            color: #b45309;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .no-record {
            color: #94a3b8;
            font-style: italic;
          }
          @media print {
            body {
              padding: 10mm;
            }
            .brand-section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-header">
          <div class="title-area">
            <h1>HSG Global Stock Take Report</h1>
          </div>
        </div>
        
        <div class="meta-card">
          <div class="meta-item">
            <span class="meta-label">Audit by</span>
            <span class="meta-value">${auditorName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Audit date</span>
            <span class="meta-value">${auditDate}</span>
          </div>
        </div>

        ${brandSectionsHtml}

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([printHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Handler to print overall current inventory status
  const handlePrintStockReport = () => {
    const auditorName = logs.length > 0 ? lookupUser(logs[0].auditorId) : "Unknown";
    const auditDate = latestLogDateStr || "N/A";
    generatePrintReport(auditorName, auditDate, currentStockLevels);
  };

  // Handler to print a specific audit log from history
  const handlePrintLogReport = (log: ParsedLog) => {
    const auditorName = lookupUser(log.auditorId);
    
    // Group this log's items by brand
    const stockLevels: typeof currentStockLevels = {};
    log.items.forEach(item => {
      const prodInfo = lookupProduct(item.sku);
      const brand = prodInfo.brand || "Unbranded";
      
      if (!stockLevels[brand]) {
        stockLevels[brand] = [];
      }
      
      stockLevels[brand].push({
        sku: item.sku,
        name: prodInfo.name,
        uom: prodInfo.uom,
        qty: item.qty,
        dateStr: log.dateStr,
        auditor: auditorName,
        hasRecord: true,
        skipped: item.skipped
      });
    });

    const logDate = new Date(log.timestamp);
    const day = String(logDate.getDate()).padStart(2, "0");
    const month = String(logDate.getMonth() + 1).padStart(2, "0");
    const year = logDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    generatePrintReport(auditorName, formattedDate, stockLevels);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[15px] animate-tableFadeInOnly">
      {/* Headless component to project the sub-tabs into TopBar (with no icons) */}
      <NavigationTabs
        tabs={tabsListItems}
        activeTabId={subTab}
        onTabSelect={(id) => setSubTab(id as "stock" | "logs")}
      />

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between bg-[#F0F4F9]/60 border border-slate-200/80 rounded-lg p-3 shrink-0 gap-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-zinc-600" />
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            {subTab === "stock"
              ? (latestLogDateStr ? `Current Inventory Levels (as of ${latestLogDateStr})` : "Current Inventory Levels")
              : "Stock Audit Records Database"}
          </span>
        </div>

        {subTab === "stock" ? (
          // Stock Tab Filters
          <div className="flex flex-wrap items-center gap-3">
            {(searchQuery || selectedBrand !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBrand("all");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline font-semibold transition-colors cursor-pointer whitespace-nowrap mr-1"
                title="Clear filters"
              >
                Clear Filters
              </button>
            )}

            {/* Search Input */}
            <div className="relative w-52">
              <input
                type="text"
                placeholder="Search Product / SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded p-1.5 pl-7 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Brand Dropdown Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-white border border-zinc-300 rounded p-1.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
            >
              <option value="all">All Brands</option>
              {brandsList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Print Stock Report Button */}
            <CustomButton
              onClick={handlePrintStockReport}
              variant="default"
              className="h-9 gap-1.5 font-bold cursor-pointer"
            >
              <Printer size={13} className="text-zinc-500" />
              <span>Print Report</span>
            </CustomButton>
          </div>
        ) : (
          // Logs Tab Filters
          <div className="flex flex-wrap items-center gap-3">
            {(searchAuditor || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchAuditor("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline font-semibold transition-colors cursor-pointer whitespace-nowrap mr-1"
                title="Clear filters"
              >
                Clear Filters
              </button>
            )}

            {/* Search Auditor Input */}
            <div className="relative w-44">
              <input
                type="text"
                placeholder="Search Auditor..."
                value={searchAuditor}
                onChange={(e) => setSearchAuditor(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded p-1.5 pl-7 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
              />
              <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Range Inputs */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
              <Calendar size={12} className="text-zinc-400" />
              <span>Range</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-zinc-300 rounded p-1.5 font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9 text-xs"
              />
              <span className="mx-0.5 text-zinc-400 font-normal">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-zinc-300 rounded p-1.5 font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-grow overflow-y-auto min-h-0 pr-1">
        {fetching && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
            <span className="text-xs font-semibold">Loading stock take data...</span>
          </div>
        ) : subTab === "stock" ? (
          // 1. Current Stock Levels View (Grouped by Brand - Masonry Columns Layout)
          <div className="columns-1 xl:columns-2 gap-6 pb-6 [column-fill:balance]">
            {Object.keys(currentStockLevels).length === 0 ? (
              <div className="flex items-center justify-center h-48 bg-[#F0F4F9] border border-dashed border-slate-200 rounded select-none w-full">
                <span className="font-primary text-sm text-zinc-500 italic">
                  No matching products found.
                </span>
              </div>
            ) : (
              Object.entries(currentStockLevels).map(([brandName, brandItems]) => (
                <div key={brandName} className="break-inside-avoid bg-white border border-slate-200 rounded p-4 shadow-xs flex flex-col gap-3 mb-6">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Brand: {brandName}</span>
                    <span className="text-[10px] font-bold text-zinc-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 uppercase tracking-wider">
                      {brandItems.length} {brandItems.length === 1 ? "Product" : "Products"}
                    </span>
                  </div>

                  {/* Brand Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">SKU Code</th>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-right">Current Stock</th>
                          <th className="py-2.5 px-3 text-right">Carton/Loose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 text-xs">
                        {brandItems.map((item) => {
                          const cartons = Math.floor(item.qty / item.uom);
                          const loose = item.qty % item.uom;
                          let displayCartonLoose = "-";
                          if (item.hasRecord && !item.skipped) {
                            if (cartons > 0 && loose > 0) {
                              displayCartonLoose = `${cartons}ctn ${loose}pcs`;
                            } else if (cartons > 0) {
                              displayCartonLoose = `${cartons}ctn`;
                            } else {
                              displayCartonLoose = `${loose}pcs`;
                            }
                          }

                          return (
                            <tr key={item.sku} className="hover:bg-slate-50 font-semibold text-zinc-900">
                              <td className="py-2 px-3 font-bold text-zinc-650">{item.sku}</td>
                              <td className="py-2 px-3 text-zinc-950 font-semibold truncate max-w-[150px]" title={item.name}>{item.name}</td>
                              <td className="py-2 px-3 text-right">
                                {item.skipped ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-250 text-[10px] text-amber-600 font-bold select-none">
                                    Skipped
                                  </span>
                                ) : item.hasRecord ? (
                                  <span className="text-blue-600 font-bold">{item.qty} pcs</span>
                                ) : (
                                  <span className="text-zinc-400 font-normal italic">No count recorded</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right text-zinc-650 font-bold">
                                {item.skipped ? (
                                  <span className="text-zinc-400 font-normal italic">-</span>
                                ) : item.hasRecord ? (
                                  <span>{displayCartonLoose}</span>
                                ) : (
                                  <span className="text-zinc-400 font-normal italic">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // 2. Logs Table View
          <div className="overflow-hidden flex flex-col h-full">
            <DataTable
              columns={columns}
              data={logsTableData}
              title="Stock Audit Records"
              userRole="viewer"
              fetching={fetching}
              syncStatus={syncStatus}
              height="h-[calc(100vh-270px)]"
            />
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-fadeIn animate-duration-150">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden animate-scaleIn animate-duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2 text-zinc-800">
                <FileText size={18} className="text-blue-500" />
                <h3 className="text-base font-bold">Audit Report Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Subheader Details */}
            <div className="grid grid-cols-2 gap-4 bg-[#F0F4F9]/50 border border-slate-200/50 rounded-lg p-4 text-xs font-semibold text-zinc-700">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium uppercase tracking-wider">Audited By:</span>
                <span className="text-zinc-900 font-bold">{lookupUser(selectedLog.auditorId)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium uppercase tracking-wider">Timestamp:</span>
                <span className="text-zinc-900 font-bold">{selectedLog.dateStr}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-grow overflow-y-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">SKU Code</th>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4">Brand</th>
                    <th className="py-2.5 px-4 text-right">Counted Qty</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {selectedLog.items.map((item, idx) => {
                    const prodInfo = lookupProduct(item.sku);
                    const cartons = Math.floor(item.qty / prodInfo.uom);
                    const loose = item.qty % prodInfo.uom;
                    let displayQty = `${item.qty} pcs`;
                    if (cartons > 0 && loose > 0) {
                      displayQty = `${cartons} ctn, ${loose} pcs`;
                    } else if (cartons > 0) {
                      displayQty = `${cartons} ctn`;
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50 font-semibold text-zinc-900">
                        <td className="py-2 px-4 font-bold text-zinc-650">{item.sku}</td>
                        <td className="py-2 px-4 max-w-[200px] truncate" title={prodInfo.name}>
                          {prodInfo.name}
                        </td>
                        <td className="py-2 px-4 text-zinc-500 font-medium">{prodInfo.brand}</td>
                        <td className="py-2 px-4 text-right font-bold text-blue-600">{item.skipped ? "-" : displayQty}</td>
                        <td className="py-2 px-4 text-center">
                          {item.skipped ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] text-amber-600 font-bold">
                              <AlertCircle size={10} />
                              <span>Skipped</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-600 font-bold">
                              <CheckCircle2 size={10} />
                              <span>Counted</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-zinc-200 gap-2">
              <CustomButton onClick={() => handlePrintLogReport(selectedLog)} variant="default" className="px-4 gap-1.5">
                <Printer size={13} />
                <span>Print Report</span>
              </CustomButton>
              <CustomButton onClick={() => setSelectedLog(null)} variant="secondary" className="px-4">
                Close Report
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
