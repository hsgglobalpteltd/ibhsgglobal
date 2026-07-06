"use client";

import * as React from "react";
import { showToast } from "@/lib/toast";
import { X, Calendar, Filter, Layers, HelpCircle, Printer } from "lucide-react";
import { CustomButton } from "../custom-button";

interface StoresVisibilityModuleProps {
  profile?: {
    role: string;
    modules_access: string[];
  } | null;
}

export function StoresVisibilityModule({ profile }: StoresVisibilityModuleProps) {
  // DB states
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [productLogs, setProductLogs] = React.useState<any[]>([]);
  const [shelfLogs, setShelfLogs] = React.useState<any[]>([]);

  // UI state
  const [fetching, setFetching] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"idle" | "syncing" | "synced">("idle");
  const [extracting, setExtracting] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  
  // Selected filter states
  const [selectedRetailer, setSelectedRetailer] = React.useState<string>("");
  const [selectedBrand, setSelectedBrand] = React.useState<string>("");
  const [includeNotCarry, setIncludeNotCarry] = React.useState<boolean>(false);
  
  const [startDate, setStartDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  
  const [endDate, setEndDate] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Results state
  const [extractedStores, setExtractedStores] = React.useState<any[]>([]);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  // Parser helper to safely handle Unix Epoch and ISO date strings
  const parseTimestamp = React.useCallback((timestamp: any): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === "number") {
      if (timestamp >= 30000 && timestamp <= 60000) {
        return new Date(Math.round((timestamp - 25569) * 86400 * 1000));
      }
      return new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    }
    const str = String(timestamp ?? "").trim();
    if (!str) return new Date(NaN);

    if (/^\d+(\.\d+)?$/.test(str)) {
      const num = Number(str);
      if (num >= 30000 && num <= 60000) {
        return new Date(Math.round((num - 25569) * 86400 * 1000));
      }
      return new Date(num < 10000000000 ? num * 1000 : num);
    }

    // Natively parse ISO format (containing T or Z) first to preserve UTC timezone offsets
    if (str.includes("T") || str.includes("Z")) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
    if (matchSlash) {
      const day = Number(matchSlash[1]);
      const month = Number(matchSlash[2]) - 1;
      const year = Number(matchSlash[3]);
      const hours = matchSlash[4] ? Number(matchSlash[4]) : 0;
      const minutes = matchSlash[5] ? Number(matchSlash[5]) : 0;
      const seconds = matchSlash[6] ? Number(matchSlash[6]) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }

    const matchDash = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
    if (matchDash) {
      const year = Number(matchDash[1]);
      const month = Number(matchDash[2]) - 1;
      const day = Number(matchDash[3]);
      const hours = matchDash[4] ? Number(matchDash[4]) : 0;
      const minutes = matchDash[5] ? Number(matchDash[5]) : 0;
      const seconds = matchDash[6] ? Number(matchDash[6]) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }

    return new Date(str);
  }, []);

  // Date formatting utility to dd/mm/yyyy
  const formatDate = React.useCallback((timestamp: any): string => {
    if (!timestamp) return "";
    const date = parseTimestamp(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, [parseTimestamp]);

  // Helper helper to cache and return json
  const fetchSheet = async (sheetName: string) => {
    const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.value || []);
    localStorage.setItem(`${sheetName}_data`, JSON.stringify(items));
    return items;
  };

  const fetchFreshData = async (sheetName: string, forceSync = false) => {
    try {
      if (forceSync) {
        const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}&skipCache=true`);
        if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.value || []);
        localStorage.setItem(`${sheetName}_data`, JSON.stringify(items));
        return items;
      }
      return await fetchSheet(sheetName);
    } catch (e) {
      console.warn("Background fetch failed for " + sheetName, e);
      return [];
    }
  };

  // Load cache on mount & silent refresh
  React.useEffect(() => {
    const pLogsCached = localStorage.getItem("Merch_Visit_Product_Audit_Logs_data");
    const sLogsCached = localStorage.getItem("Merch_Visit_Shelf_Audit_Logs_data");
    const storesCached = localStorage.getItem("Store_Retailer_DB_data");
    const productsCached = localStorage.getItem("products_DB_data");
    const retailersCached = localStorage.getItem("retailers_DB_data");
    const brandsCached = localStorage.getItem("brands_DB_data");

    if (pLogsCached) setProductLogs(JSON.parse(pLogsCached));
    if (sLogsCached) setShelfLogs(JSON.parse(sLogsCached));
    if (storesCached) setStores(JSON.parse(storesCached));
    if (productsCached) setProducts(JSON.parse(productsCached));
    if (retailersCached) setRetailers(JSON.parse(retailersCached));
    if (brandsCached) setBrands(JSON.parse(brandsCached));

    setFetching(true);
    Promise.all([
      fetchSheet("Merch_Visit_Product_Audit_Logs"),
      fetchSheet("Merch_Visit_Shelf_Audit_Logs"),
      fetchSheet("Store_Retailer_DB"),
      fetchSheet("products_DB"),
      fetchSheet("retailers_DB"),
      fetchSheet("brands_DB")
    ]).then(([p, s, st, pr, rt, br]) => {
      setProductLogs(p);
      setShelfLogs(s);
      setStores(st);
      setProducts(pr);
      setRetailers(rt);
      setBrands(br);
      setSyncStatus("synced");
      
      // Auto-select first options if available
      if (rt.length > 0 && !selectedRetailer) {
        setSelectedRetailer(String(rt[0].ID));
      }
      if (br.length > 0 && !selectedBrand) {
        setSelectedBrand(String(br[0].ID));
      }
    }).catch(err => {
      console.error("Silent background load failed", err);
      showToast("Offline mode: Using locally cached data", "info");
    }).finally(() => {
      setFetching(false);
    });
  }, []);

  // Listen for the global db-refresh event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      setSyncStatus("syncing");
      setFetching(true);
      try {
        const [p, s, st, pr, rt, br] = await Promise.all([
          fetchFreshData("Merch_Visit_Product_Audit_Logs", true),
          fetchFreshData("Merch_Visit_Shelf_Audit_Logs", true),
          fetchFreshData("Store_Retailer_DB", true),
          fetchFreshData("products_DB", true),
          fetchFreshData("retailers_DB", true),
          fetchFreshData("brands_DB", true)
        ]);
        setProductLogs(p);
        setShelfLogs(s);
        setStores(st);
        setProducts(pr);
        setRetailers(rt);
        setBrands(br);
        setSyncStatus("synced");
        showToast("Database cache refreshed from Google Sheets!", "success");
      } catch (err: any) {
        showToast("Failed to refresh database: " + err.message, "error");
      } finally {
        setFetching(false);
      }
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, []);

  // Listen for scroll events to collapse/expand filter dropdowns in the sticky header
  React.useEffect(() => {
    let scrolled = false;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target) {
        const scrollTop = target.scrollTop || window.scrollY || (document.documentElement ? document.documentElement.scrollTop : 0);
        if (!scrolled && scrollTop > 100) {
          scrolled = true;
          setIsScrolled(true);
        } else if (scrolled && scrollTop < 20) {
          scrolled = false;
          setIsScrolled(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Auto-extract whenever any filter state or data log array changes
  React.useEffect(() => {
    if (selectedRetailer && selectedBrand && stores.length > 0) {
      handleExtract();
    }
  }, [selectedRetailer, selectedBrand, startDate, endDate, includeNotCarry, stores, productLogs, shelfLogs]);

  const handleExtract = () => {
    if (!selectedRetailer) {
      showToast("Please select a Retailer", "error");
      return;
    }
    if (!selectedBrand) {
      showToast("Please select a Brand", "error");
      return;
    }

    setExtracting(true);

    try {
      // Calculate local timestamps based on dates
      const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
      const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
      
      const startMs = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0).getTime();
      const endMs = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999).getTime();

      // Find stores belonging to the selected Retailer
      const filteredStores = stores.filter(store => {
        const retId = store["Retailers ID"] || store["Retailer ID"];
        return String(retId) === String(selectedRetailer);
      });

      // Filter products belonging to the selected Brand
      const brandProducts = products.filter(p => {
        const brandId = p["Brands ID"] || p["Brand ID"];
        return String(brandId) === String(selectedBrand);
      });

      const brandSkus = brandProducts.map(p => String(p.SKU).toLowerCase());

      const results = filteredStores.map(store => {
        // Find visits/audits within date range for this store (from Merch_Visit_Product_Audit_Logs)
        const storeProductLogs = productLogs.filter(log => {
          const storeId = log["Retailer Stores ID"] || log["Store ID"];
          if (String(storeId) !== String(store.ID)) return false;
          const timestamp = parseTimestamp(log.Timestamp).getTime();
          return timestamp >= startMs && timestamp <= endMs;
        });

        // Sort descending to get latest visits within date range
        const sortedProductLogs = [...storeProductLogs].sort((a, b) => {
          return parseTimestamp(b.Timestamp).getTime() - parseTimestamp(a.Timestamp).getTime();
        });

        // Find all shelf logs for this store and brand (ignoring date range)
        const storeShelfLogsAllTime = shelfLogs.filter(sl => {
          const storeId = sl["Retailer Stores ID"] || sl["Store ID"];
          const brandId = sl["Brands ID"] || sl["Brand ID"];
          return String(storeId) === String(store.ID) && String(brandId) === String(selectedBrand);
        });

        // Sort descending to get latest shelf logs
        const sortedShelfLogsAllTime = [...storeShelfLogsAllTime].sort((a, b) => {
          return parseTimestamp(b.Timestamp).getTime() - parseTimestamp(a.Timestamp).getTime();
        });

        // The latest audit time of all time for sorting
        const latestAuditTime = sortedShelfLogsAllTime.length > 0
          ? parseTimestamp(sortedShelfLogsAllTime[0].Timestamp).getTime()
          : 0;

        // Deduplicate all-time visits by formatted date string, keeping the latest visit for each unique date
        const uniqueDateVisitsMap = new Map<string, any>();
        sortedShelfLogsAllTime.forEach(log => {
          const formattedDate = formatDate(log.Timestamp);
          if (!uniqueDateVisitsMap.has(formattedDate)) {
            const rawRemark = String(log.Remark ?? log.remark ?? "").trim();
            uniqueDateVisitsMap.set(formattedDate, {
              date: formattedDate,
              remark: rawRemark === "No remark" || !rawRemark ? "" : rawRemark
            });
          }
        });

        const latestVisits = Array.from(uniqueDateVisitsMap.values()).slice(0, 3);

        // Latest visit products
        let carriedProductsList: { name: string; qty: number }[] = [];
        let carriesBrand = false;

        if (sortedProductLogs.length > 0) {
          const latestLog = sortedProductLogs[0];
          let auditedSkus: any[] = [];
          try {
            auditedSkus = JSON.parse(latestLog["Audit JSON"] || "[]");
          } catch (e) {
            console.warn("Failed to parse Audit JSON for log ID: " + latestLog.Timestamp);
          }

          auditedSkus.forEach((auditItem: any) => {
            const sku = String(auditItem.sku).toLowerCase();
            if (brandSkus.includes(sku)) {
              const qty = Number(auditItem.qty) || 0;
              const prodDetail = brandProducts.find(p => String(p.SKU).toLowerCase() === sku);
              const prodName = prodDetail ? prodDetail["Display Name"] : auditItem.sku;
              
              carriedProductsList.push({
                name: prodName,
                qty
              });

              if (qty > 0) {
                carriesBrand = true;
              }
            }
          });
        }

        // Shelf visibility image for selected store and brand in date range
        const storeShelfLogs = shelfLogs.filter(sl => {
          const storeId = sl["Retailer Stores ID"] || sl["Store ID"];
          const brandId = sl["Brands ID"] || sl["Brand ID"];
          if (String(storeId) !== String(store.ID)) return false;
          if (String(brandId) !== String(selectedBrand)) return false;
          const timestamp = parseTimestamp(sl.Timestamp).getTime();
          return timestamp >= startMs && timestamp <= endMs;
        });

        const sortedShelfLogs = [...storeShelfLogs].sort((a, b) => {
          return parseTimestamp(b.Timestamp).getTime() - parseTimestamp(a.Timestamp).getTime();
        });

        const latestShelfImage = sortedShelfLogs.length > 0 ? sortedShelfLogs[0]["Image Link"] : null;

        return {
          id: store.ID,
          storeName: store["Display Name"] || `Store #${store.ID}`,
          address: store.Address || "No address listed",
          activities: latestVisits,
          products: carriedProductsList,
          shelfImage: latestShelfImage,
          carriesBrand,
          latestAuditTime
        };
      });

      // Filter based on includeNotCarry tick
      const filteredResults = results.filter(item => {
        if (!item) return false;
        if (includeNotCarry) return true;
        // If not checked, only include stores that have visits carrying the brand's products
        return item.carriesBrand;
      });

      // Sort stores by latest audit date descending (latest first)
      filteredResults.sort((a, b) => b.latestAuditTime - a.latestAuditTime);

      setExtractedStores(filteredResults);
    } catch (e: any) {
      showToast("Extraction failed: " + e.message, "error");
    } finally {
      setExtracting(false);
    }
  };

  const activeRetailerName = React.useMemo(() => {
    const found = retailers.find(r => String(r.ID) === String(selectedRetailer));
    return found ? found["Display Name"] : "";
  }, [retailers, selectedRetailer]);

  const activeBrandName = React.useMemo(() => {
    const found = brands.find(b => String(b.ID) === String(selectedBrand));
    return found ? found["Display Name"] : "";
  }, [brands, selectedBrand]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 font-primary text-zinc-900 print:bg-white print:p-0">
      {/* Local custom sticky styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .sticky-header-module {
          position: sticky;
          top: -16px;
          z-index: 30;
        }
        @media (min-width: 640px) {
          .sticky-header-module {
            top: -24px;
          }
        }
        @media (min-width: 1024px) {
          .sticky-header-module {
            top: -32px;
          }
        }
        @media print {
          .sticky-header-module {
            position: relative !important;
            top: auto !important;
            padding-top: 0px !important;
            z-index: auto !important;
            border: none !important;
            box-shadow: none !important;
            margin-bottom: 24px !important;
            background: transparent !important;
            background-color: transparent !important;
          }
        }
      `}} />
      {/* Sticky Header Wrapper */}
      <div className={`sticky-header-module bg-[#EEEEEE] z-20 pt-6 pb-2.5 flex flex-col gap-2.5 transition-all duration-500 print:relative print:top-auto print:bg-transparent print:pt-0 print:pb-0 ${
        isScrolled ? "shadow-xs border-b border-zinc-300/80 mb-2" : "border-b border-zinc-300/40"
      }`}>
        {/* Row 1: Title, Filters, Print Button */}
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Left: Title */}
          <h2 className="text-lg font-black text-zinc-950 uppercase tracking-wide flex-shrink-0 select-none">
            Stores Visibility
          </h2>
          
          {/* Middle: Collapsible Filter Container */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden print:hidden flex-1 flex justify-center ${
            isScrolled ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[850px] opacity-100"
          }`}>
            <div className="flex items-center gap-4">
              {/* Retailer Dropdown */}
              <div className="flex flex-col gap-1 w-36">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 select-none">
                  <Layers size={9} /> Retailer
                </label>
                <select
                  value={selectedRetailer}
                  onChange={(e) => setSelectedRetailer(e.target.value)}
                  className="w-full bg-[#EEEEEE] border border-zinc-300 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 select-none cursor-pointer"
                >
                  <option value="" disabled>Select Retailer...</option>
                  {retailers.map((r) => (
                    <option key={r.ID} value={r.ID}>
                      {r["Display Name"]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand Dropdown */}
              <div className="flex flex-col gap-1 w-36">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 select-none">
                  <Filter size={9} /> Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-[#EEEEEE] border border-zinc-300 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 select-none cursor-pointer"
                >
                  <option value="" disabled>Select Brand...</option>
                  {brands.map((b) => (
                    <option key={b.ID} value={b.ID}>
                      {b["Display Name"]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Picker Start */}
              <div className="flex flex-col gap-1 w-28">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 select-none">
                  <Calendar size={9} /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#EEEEEE] border border-zinc-300 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 cursor-pointer"
                />
              </div>

              {/* Date Picker End */}
              <div className="flex flex-col gap-1 w-28">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 select-none">
                  <Calendar size={9} /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#EEEEEE] border border-zinc-300 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 cursor-pointer"
                />
              </div>

              {/* Tick Checkbox */}
              <div className="flex items-center h-8 mt-3.5">
                <label className="inline-flex items-center gap-1.5 select-none cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeNotCarry}
                    onChange={(e) => setIncludeNotCarry(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-500 focus:ring-offset-[#EEEEEE] h-3.5 w-3.5 bg-transparent cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-800 transition-colors">
                    Not Carry
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Right: Print Button */}
          <div className="flex-shrink-0 print:hidden">
            {extractedStores.length > 0 && (
              <CustomButton variant="dark" onClick={handlePrint} className="h-8 py-0 px-3 text-xs">
                <Printer size={12} />
                <span>Print Report</span>
              </CustomButton>
            )}
          </div>
        </div>

        {/* Row 2 & 3: Visual summary bar & Mimicked Column Header */}
        {selectedRetailer && selectedBrand && stores.length > 0 && extractedStores.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Filter Summary Bar */}
            <div className="flex items-center justify-between bg-zinc-100/60 border border-zinc-300/80 rounded-lg px-4 py-1.5 text-xs font-semibold text-zinc-600 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>Filter Summary:</span>
                <span className="bg-zinc-200 text-zinc-800 rounded px-1.5 py-0.5">{activeRetailerName}</span>
                <span>/</span>
                <span className="bg-zinc-200 text-zinc-800 rounded px-1.5 py-0.5">{activeBrandName}</span>
                <span>/</span>
                <span className="bg-zinc-200 text-zinc-800 rounded px-1.5 py-0.5">
                  {formatDate(startDate)} - {formatDate(endDate)}
                </span>
              </div>
              <div>
                <span>Found: <strong className="text-zinc-800">{extractedStores.length}</strong> outlets</span>
              </div>
            </div>
            
            {/* Mimicked Column Header (hidden on print) */}
            <div className="w-full bg-zinc-200 border border-zinc-300 rounded-lg flex text-[10px] font-black text-zinc-600 uppercase tracking-wider select-none print:hidden">
              <div className="px-4 py-2.5 border-r border-zinc-300" style={{ width: "20%" }}>Store Details</div>
              <div className="px-4 py-2.5 border-r border-zinc-300" style={{ width: "40%" }}>Recent Visit</div>
              <div className="px-4 py-2.5 border-r border-zinc-300" style={{ width: "20%" }}>Products</div>
              <div className="px-4 py-2.5" style={{ width: "20%" }}>Shelf Visibility</div>
            </div>
          </div>
        )}
      </div>

      {/* Report Display Container */}
      <div className="w-full">
        {!selectedRetailer || !selectedBrand ? (
          <div className="bg-[#E5E5E5]/40 border border-dashed border-zinc-300 rounded-lg p-10 flex flex-col items-center justify-center text-center h-64 print:hidden">
            <Filter size={32} className="text-zinc-400 mb-2.5" />
            <p className="text-sm font-semibold text-zinc-500">
              Please select a Retailer and Brand
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Use the filters above to populate the visibility report automatically.
            </p>
          </div>
        ) : (fetching && stores.length === 0) ? (
          <div className="bg-[#E5E5E5]/40 border border-dashed border-zinc-300 rounded-lg p-10 flex flex-col items-center justify-center text-center h-64 print:hidden">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-zinc-500">
              Loading visibility database...
            </p>
          </div>
        ) : (
          <div className={`flex flex-col gap-4 animate-tableFadeInOnly transition-opacity duration-200 ${extracting ? "opacity-60" : "opacity-100"}`}>

            {/* Visual summary bar removed (rendered in sticky header) */}

            {/* Result Table */}
            {extractedStores.length === 0 ? (
              <div className="bg-[#E5E5E5]/40 border border-dashed border-zinc-300 rounded-lg p-10 flex flex-col items-center justify-center text-center h-48">
                <HelpCircle size={28} className="text-zinc-400 mb-2" />
                <p className="text-sm font-semibold text-zinc-500">
                  No stores match the current filters.
                </p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Try ticking **"Include Stores Not Carry"** or expanding the date range.
                </p>
              </div>
            ) : (
              <div className="w-full border border-zinc-300 rounded-lg bg-zinc-50 overflow-hidden shadow-2xs print:border-zinc-400">
                <table className="w-full text-left border-collapse table-fixed border border-zinc-300">
                  <thead className="hidden print:table-header-group">
                    <tr className="bg-zinc-200 border-b border-zinc-300 text-[10px] font-black text-zinc-600 uppercase tracking-wider select-none print:bg-zinc-100 print:border-zinc-400">
                      <th className="px-4 py-3 border-r border-zinc-300" style={{ minWidth: "20%", maxWidth: "20%", width: "20%", verticalAlign: "top" }}>Store Details</th>
                      <th className="px-4 py-3 border-r border-zinc-300" style={{ minWidth: "40%", maxWidth: "40%", width: "40%", verticalAlign: "top" }}>Recent Visit</th>
                      <th className="px-4 py-3 border-r border-zinc-300" style={{ minWidth: "20%", maxWidth: "20%", width: "20%", verticalAlign: "top" }}>Products</th>
                      <th className="px-4 py-3" style={{ minWidth: "20%", maxWidth: "20%", width: "20%", verticalAlign: "top" }}>Shelf Visibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 print:divide-zinc-300">
                    {extractedStores.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-zinc-100/50 transition-colors align-top print:hover:bg-transparent"
                      >
                        {/* Store Details (Fixed 20% width) */}
                        <td className="px-4 py-3.5 border-r border-zinc-200 text-xs" style={{ minWidth: "20%", maxWidth: "20%", width: "20%", verticalAlign: "top" }}>
                          <div className="w-full overflow-hidden">
                            <div className="font-bold text-zinc-950 whitespace-normal break-words">
                              {item.storeName}
                            </div>
                            <div className="text-zinc-500 mt-1 whitespace-normal break-words leading-relaxed">
                              {item.address}
                            </div>
                          </div>
                        </td>

                        {/* Recent Visit (Fixed 40% width) */}
                        <td className="px-4 py-3.5 border-r border-zinc-200 text-xs" style={{ minWidth: "40%", maxWidth: "40%", width: "40%", verticalAlign: "top" }}>
                          <div className="w-full overflow-hidden">
                            {item.activities.length === 0 ? (
                              <span className="text-zinc-400 italic">
                                No visits recorded
                              </span>
                            ) : (
                              <div className="flex flex-col gap-4 py-0.5">
                                {item.activities.map((visit: any, index: number) => (
                                  <div 
                                    key={index}
                                    className="relative pl-5 whitespace-normal break-words"
                                  >
                                    {/* Timeline connector line */}
                                    {index < item.activities.length - 1 && (
                                      <div className="absolute left-1.5 top-3.5 bottom-[-16px] w-[2px] bg-zinc-200 print:bg-zinc-300" />
                                    )}
                                    
                                    {/* Timeline Dot */}
                                    <div className="absolute left-0.5 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600 border border-white shadow-3xs" />
                                    
                                    {/* Date Badge */}
                                    <div className="flex items-center select-none">
                                      <span className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide leading-none">
                                        {visit.date}
                                      </span>
                                    </div>

                                    {/* Remark */}
                                    {visit.remark && (
                                      <div className="text-zinc-600 font-medium mt-1 leading-relaxed">
                                        {visit.remark}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Products (Fixed 20% width) */}
                        <td className="px-4 py-3.5 border-r border-zinc-200 text-xs" style={{ minWidth: "20%", maxWidth: "20%", width: "20%", verticalAlign: "top" }}>
                          <div className="w-full overflow-hidden">
                            {item.products.length === 0 ? (
                              <span className="text-zinc-400 italic">
                                No products carry
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {item.products.map((prod: any, index: number) => (
                                  <div 
                                    key={index}
                                    className="flex justify-between items-baseline gap-2 w-full overflow-hidden"
                                  >
                                    <span className="text-zinc-700 truncate" title={prod.name}>
                                      {prod.name}
                                    </span>
                                    <span className="font-bold text-zinc-950 tabular-nums flex-shrink-0">
                                      {prod.qty}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Shelf Visibility (Fixed 20% width) */}
                        <td className="px-4 py-3.5 text-xs" style={{ minWidth: "20%", maxWidth: "20%", width: "20%", verticalAlign: "top" }}>
                          <div className="w-full overflow-hidden">
                            {item.shelfImage ? (
                              <div 
                                onClick={() => setSelectedImage(item.shelfImage)}
                                className="relative aspect-[4/5] w-24 border border-zinc-300 rounded overflow-hidden bg-zinc-100 cursor-zoom-in group shadow-3xs hover:shadow-2xs select-none"
                              >
                                <img 
                                  src={item.shelfImage} 
                                  alt="Shelf compliance check" 
                                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/400x500?text=Load+Error";
                                  }}
                                />
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic">No Photo</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal Popup */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-tableFadeInOnly p-4 print:hidden"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-xl overflow-hidden flex flex-col animate-modalSlideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-10 flex items-center justify-between px-4 bg-[#E5E5E5] border-b border-zinc-300">
              <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider select-none">
                Shelf Visibility Photo Preview
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-full hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer focus:outline-none"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Image Container */}
            <div className="p-6 flex items-center justify-center bg-white overflow-auto max-h-[70vh]">
              <img 
                src={selectedImage} 
                alt="Shelf Compliance Detail" 
                className="max-w-full max-h-[60vh] object-contain rounded border border-zinc-200 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/400x500?text=Failed+to+Load+Image";
                }}
              />
            </div>
            
            {/* Modal Footer with URL link */}
            <div className="bg-[#E5E5E5] border-t border-zinc-300 px-4 py-2 flex justify-between items-center text-[10px] text-zinc-500 font-mono select-none">
              <span className="truncate max-w-[70%]">{selectedImage}</span>
              <a 
                href={selectedImage} 
                target="_blank" 
                rel="noreferrer" 
                className="text-zinc-600 hover:text-zinc-950 font-bold hover:underline cursor-pointer"
              >
                Open Original ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Custom print stylesheet for A4 landscape and web layout parity */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          /* Hide sidebar, topbar, mobile block, and web-only action controls */
          aside, header, .flex.md\\:hidden, .print\\:hidden, .toast-container, [role="status"] {
            display: none !important;
          }
          
          /* Reset root and page containers to allow clean full-width printout */
          body, html {
            background: #ffffff !important;
            color: #09090b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          /* Force container to allow normal multi-page flow */
          .hidden.md\\:flex.h-screen,
          .flex.flex-col.flex-1.h-screen.overflow-hidden {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            background: transparent !important;
          }

          /* Main container print reset */
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Reset table and outer cards borders */
          .w-full.border.border-zinc-300 {
            border: 1px solid #a1a1aa !important; /* zinc-400 */
            border-radius: 0.5rem !important;
            background: #ffffff !important;
          }

          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }

          th, td {
            border: 1px solid #d4d4d8 !important; /* zinc-300 */
          }

          /* Exact background color printing */
          .bg-zinc-200 {
            background-color: #e4e4e7 !important; /* zinc-200 */
          }
          .bg-zinc-100\\/60 {
            background-color: #f4f4f5 !important; /* zinc-100 */
          }
          .bg-zinc-50 {
            background-color: #fafafa !important; /* zinc-50 */
          }
          .bg-indigo-50 {
            background-color: #e0e7ff !important; /* indigo-50 */
          }
          .bg-indigo-600 {
            background-color: #4f46e5 !important; /* indigo-600 */
          }

          .text-indigo-700 {
            color: #4338ca !important; /* indigo-700 */
          }
          .text-indigo-600 {
            color: #4f46e5 !important; /* indigo-600 */
          }
          
          .border-indigo-100 {
            border-color: #c7d2fe !important;
          }
          .border-zinc-300 {
            border-color: #d4d4d8 !important;
          }
          .border-zinc-200 {
            border-color: #e4e4e7 !important;
          }

          /* Page break avoidance for table rows */
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
