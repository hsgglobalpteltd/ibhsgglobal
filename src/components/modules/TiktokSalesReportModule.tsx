"use client";

import * as React from "react";
import { 
  TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle, 
  Search, Download, RefreshCw, X, ArrowUpDown, 
  Eye, Store, ArrowUpRight
} from "lucide-react";
import { showToast } from "@/lib/toast";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface OrderItem {
  product_name: string;
  sku_name: string;
  seller_sku: string;
  sku_image: string;
  quantity: number;
  sale_price: string;
  currency: string;
}

interface Order {
  id: string;
  shop_id: string;
  shop_name: string;
  create_time: number; // Unix seconds
  actual_status: string;
  system_status: string;
  recipient_name: string;
  shipping_provider: string;
  tracking_number: string;
  total_amount: string;
  currency: string;
  items: OrderItem[];
  is_printed?: boolean;
}

interface Shop {
  id: string;
  name: string;
}

interface SkuSummary {
  skuKey: string;
  seller_sku: string;
  product_name: string;
  sku_name: string;
  sku_image: string;
  units_sold: number;
  orders_count: number;
  total_revenue: number;
  avg_price: number;
  currency: string;
  orders: {
    order_id: string;
    create_time: number;
    shop_name: string;
    recipient_name: string;
    tracking_number: string;
    quantity: number;
    sale_price: string;
    currency: string;
    actual_status: string;
  }[];
}

export function TiktokSalesReportModule({ profile }: { profile?: any }) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Filters state
  const [selectedShopId, setSelectedShopId] = React.useState<string>("all");
  const [periodType, setPeriodType] = React.useState<"month" | "year" | "week">("month");
  
  // Date selection states
  const [selectedYear, setSelectedYear] = React.useState<string>(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });
  const [selectedWeekIndex, setSelectedWeekIndex] = React.useState<number>(0);

  // Table search & sort
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<"units_sold" | "orders_count" | "total_revenue" | "seller_sku">("units_sold");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  // Chart hover interaction
  const [hoveredChartPoint, setHoveredChartPoint] = React.useState<number | null>(null);

  // Drilldown modal
  const [selectedSkuModal, setSelectedSkuModal] = React.useState<SkuSummary | null>(null);

  // Load orders
  const loadOrders = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsSyncing(true);

      const res = await fetch(`${WORKER_URL}/api/tiktok/orders?sync=false&_t=${Date.now()}`, {
        cache: "no-store"
      });
      if (!res.ok) throw new Error("Failed to load TikTok orders");

      const data = await res.json() as any;
      if (data.success) {
        setShops(data.shops || []);
        setOrders(data.orders || []);
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) showToast(err.message || "Failed to load orders", "error");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Global db-refresh listener
  React.useEffect(() => {
    const handleRefresh = () => loadOrders(true);
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, [loadOrders]);

  // Unique list of available years and months from actual orders
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    orders.forEach(o => {
      if (o.create_time) {
        const y = String(new Date(o.create_time * 1000).getFullYear());
        years.add(y);
      }
    });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    orders.forEach(o => {
      if (o.create_time) {
        const d = new Date(o.create_time * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}-${mm}`);
      }
    });
    if (months.size === 0) {
      const d = new Date();
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Weeks list for the selected month
  const availableWeeks = React.useMemo(() => {
    if (!selectedMonth) return [];
    const [yyyyStr, mmStr] = selectedMonth.split('-');
    const yyyy = parseInt(yyyyStr);
    const mm = parseInt(mmStr) - 1;

    const lastDay = new Date(yyyy, mm + 1, 0);

    const weeks = [];
    let currentStart = 1;
    let weekNum = 1;

    while (currentStart <= lastDay.getDate()) {
      const startD = new Date(yyyy, mm, currentStart);
      const endDayNum = Math.min(currentStart + 6, lastDay.getDate());
      const endD = new Date(yyyy, mm, endDayNum);

      const startLabel = `${String(startD.getDate()).padStart(2, '0')}/${String(mm + 1).padStart(2, '0')}`;
      const endLabel = `${String(endD.getDate()).padStart(2, '0')}/${String(mm + 1).padStart(2, '0')}`;

      weeks.push({
        index: weekNum - 1,
        label: `Week ${weekNum} (${startLabel} - ${endLabel})`,
        startSec: new Date(yyyy, mm, currentStart, 0, 0, 0).getTime() / 1000,
        endSec: new Date(yyyy, mm, endDayNum, 23, 59, 59).getTime() / 1000,
      });

      currentStart += 7;
      weekNum++;
    }

    return weeks;
  }, [selectedMonth]);

  // Valid orders filtering (Excludes CANCELLED & UNPAID)
  const filteredValidOrders = React.useMemo(() => {
    return orders.filter(o => {
      // 1. Exclude Cancelled / Unpaid
      const status = (o.actual_status || "").toUpperCase();
      if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") {
        return false;
      }

      // 2. Shop filter
      if (selectedShopId !== "all" && o.shop_id !== selectedShopId) {
        return false;
      }

      // 3. Time filter
      if (!o.create_time) return false;
      const orderDate = new Date(o.create_time * 1000);

      if (periodType === "year") {
        return String(orderDate.getFullYear()) === selectedYear;
      }

      if (periodType === "month") {
        const yyyy = orderDate.getFullYear();
        const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}` === selectedMonth;
      }

      if (periodType === "week") {
        const week = availableWeeks[selectedWeekIndex];
        if (!week) return false;
        return o.create_time >= week.startSec && o.create_time <= week.endSec;
      }

      return true;
    });
  }, [orders, selectedShopId, periodType, selectedYear, selectedMonth, selectedWeekIndex, availableWeeks]);

  // Incomplete Data Detection for the current selection
  const incompleteDataInfo = React.useMemo(() => {
    if (periodType !== "month" || !selectedMonth) return null;

    const [yyyyStr, mmStr] = selectedMonth.split('-');
    const yyyy = parseInt(yyyyStr);
    const mm = parseInt(mmStr) - 1;

    const monthOrders = orders.filter(o => {
      if (!o.create_time) return false;
      const d = new Date(o.create_time * 1000);
      return d.getFullYear() === yyyy && d.getMonth() === mm;
    });

    if (monthOrders.length === 0) return null;

    const earliestOrderTime = Math.min(...monthOrders.map(o => o.create_time));
    const earliestDate = new Date(earliestOrderTime * 1000);

    if (earliestDate.getDate() > 3) {
      const dd = String(earliestDate.getDate()).padStart(2, '0');
      const mmFormatted = String(mm + 1).padStart(2, '0');
      return {
        isIncomplete: true,
        startDateFormatted: `${dd}/${mmFormatted}/${yyyy}`
      };
    }

    return null;
  }, [orders, periodType, selectedMonth]);

  // Aggregate SKU Statistics
  const skuSummaries = React.useMemo(() => {
    const map = new Map<string, SkuSummary>();

    filteredValidOrders.forEach(order => {
      const items = order.items || [];
      const orderCurrency = order.currency || "SGD";
      const seenSkusInOrder = new Set<string>();

      items.forEach(item => {
        const sellerSku = (item.seller_sku || "").trim();
        const productName = (item.product_name || "").trim();
        const skuName = (item.sku_name || "").trim();
        const skuKey = sellerSku || `${productName}_${skuName}`;

        const qty = Number(item.quantity) || 1;
        const price = parseFloat(item.sale_price) || 0;
        const revenue = qty * price;

        if (!map.has(skuKey)) {
          map.set(skuKey, {
            skuKey,
            seller_sku: sellerSku || "N/A",
            product_name: productName || "Unknown Product",
            sku_name: skuName || "-",
            sku_image: item.sku_image || "",
            units_sold: 0,
            orders_count: 0,
            total_revenue: 0,
            avg_price: price,
            currency: item.currency || orderCurrency,
            orders: []
          });
        }

        const summary = map.get(skuKey)!;
        summary.units_sold += qty;
        summary.total_revenue += revenue;

        if (!seenSkusInOrder.has(skuKey)) {
          summary.orders_count += 1;
          seenSkusInOrder.add(skuKey);
        }

        summary.orders.push({
          order_id: order.id,
          create_time: order.create_time,
          shop_name: order.shop_name || "Unknown Shop",
          recipient_name: order.recipient_name || "-",
          tracking_number: order.tracking_number || "-",
          quantity: qty,
          sale_price: item.sale_price,
          currency: item.currency || orderCurrency,
          actual_status: order.actual_status
        });
      });
    });

    return Array.from(map.values()).map(s => ({
      ...s,
      avg_price: s.units_sold > 0 ? s.total_revenue / s.units_sold : 0
    }));
  }, [filteredValidOrders]);

  // Overall KPI totals
  const kpiTotals = React.useMemo(() => {
    let totalRevenue = 0;
    let totalUnits = 0;
    skuSummaries.forEach(s => {
      totalRevenue += s.total_revenue;
      totalUnits += s.units_sold;
    });

    const totalOrders = filteredValidOrders.length;
    const sortedByUnits = [...skuSummaries].sort((a, b) => b.units_sold - a.units_sold);
    const topSku = sortedByUnits[0] || null;

    return {
      totalRevenue,
      totalOrders,
      totalUnits,
      topSku
    };
  }, [skuSummaries, filteredValidOrders]);

  // Top 5 best-selling products sorted strictly by units_sold (pcs) descending
  const top5Products = React.useMemo(() => {
    return [...skuSummaries]
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, 5);
  }, [skuSummaries]);

  // Filtered & Sorted SKU list for table
  const processedSkus = React.useMemo(() => {
    let list = skuSummaries.filter(s => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.seller_sku.toLowerCase().includes(q) ||
        s.product_name.toLowerCase().includes(q) ||
        s.sku_name.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDirection === "asc" ? valA - valB : valB - valA;
    });

    return list;
  }, [skuSummaries, searchQuery, sortField, sortDirection]);

  // Time Series Chart Data Preparation
  const chartData = React.useMemo(() => {
    if (periodType === "year") {
      const monthsData = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const mm = String(monthNum).padStart(2, '0');
        const monthLabel = new Date(2000, i, 1).toLocaleString('en-US', { month: 'short' });
        return {
          key: `${selectedYear}-${mm}`,
          label: monthLabel,
          units: 0,
          revenue: 0,
          orders: 0
        };
      });

      filteredValidOrders.forEach(o => {
        const d = new Date(o.create_time * 1000);
        const mIndex = d.getMonth();
        if (mIndex >= 0 && mIndex < 12) {
          monthsData[mIndex].orders += 1;
          (o.items || []).forEach(item => {
            const qty = Number(item.quantity) || 1;
            const price = parseFloat(item.sale_price) || 0;
            monthsData[mIndex].units += qty;
            monthsData[mIndex].revenue += qty * price;
          });
        }
      });

      return monthsData;
    }

    if (periodType === "month") {
      const [yyyyStr, mmStr] = selectedMonth.split('-');
      const yyyy = parseInt(yyyyStr);
      const mm = parseInt(mmStr) - 1;
      const daysInMonth = new Date(yyyy, mm + 1, 0).getDate();

      const daysData = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        return {
          key: String(dayNum),
          label: String(dayNum),
          units: 0,
          revenue: 0,
          orders: 0
        };
      });

      filteredValidOrders.forEach(o => {
        const d = new Date(o.create_time * 1000);
        const dayIndex = d.getDate() - 1;
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          daysData[dayIndex].orders += 1;
          (o.items || []).forEach(item => {
            const qty = Number(item.quantity) || 1;
            const price = parseFloat(item.sale_price) || 0;
            daysData[dayIndex].units += qty;
            daysData[dayIndex].revenue += qty * price;
          });
        }
      });

      return daysData;
    }

    if (periodType === "week") {
      const week = availableWeeks[selectedWeekIndex];
      const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const daysData = weekDays.map((label, idx) => ({
        key: String(idx),
        label,
        units: 0,
        revenue: 0,
        orders: 0
      }));

      filteredValidOrders.forEach(o => {
        const d = new Date(o.create_time * 1000);
        let dayIdx = d.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        if (dayIdx >= 0 && dayIdx < 7) {
          daysData[dayIdx].orders += 1;
          (o.items || []).forEach(item => {
            const qty = Number(item.quantity) || 1;
            const price = parseFloat(item.sale_price) || 0;
            daysData[dayIdx].units += qty;
            daysData[dayIdx].revenue += qty * price;
          });
        }
      });

      return daysData;
    }

    return [];
  }, [filteredValidOrders, periodType, selectedYear, selectedMonth, selectedWeekIndex, availableWeeks]);

  // Export Table to CSV
  const handleExportCSV = () => {
    if (processedSkus.length === 0) {
      showToast("No SKU records to export", "warning");
      return;
    }

    const headers = ["Seller SKU", "Product Name", "Variant", "Units Sold", "Orders Count", "Total Revenue (SGD)", "Avg Price (SGD)"];
    const rows = processedSkus.map(s => [
      `"${s.seller_sku}"`,
      `"${s.product_name.replace(/"/g, '""')}"`,
      `"${s.sku_name.replace(/"/g, '""')}"`,
      s.units_sold,
      s.orders_count,
      s.total_revenue.toFixed(2),
      s.avg_price.toFixed(2)
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TikTok_Sale_Report_${periodType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV report downloaded successfully", "success");
  };

  const handleSortToggle = (field: "units_sold" | "orders_count" | "total_revenue" | "seller_sku") => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatMonthName = (yearMonth: string) => {
    const [yyyy, mm] = yearMonth.split('-');
    const date = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const maxUnitsInChart = Math.max(...chartData.map(d => d.units), 1);

  // Smooth Line Chart Coordinates
  const svgWidth = 360;
  const svgHeight = 90;
  const paddingX = 14;
  const paddingY = 12;

  const chartPoints = React.useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((d, i) => {
      const x = chartData.length === 1 
        ? svgWidth / 2 
        : paddingX + (i / (chartData.length - 1)) * (svgWidth - 2 * paddingX);
      const y = svgHeight - paddingY - (maxUnitsInChart > 0 ? (d.units / maxUnitsInChart) * (svgHeight - 2 * paddingY) : 0);
      return { x, y, ...d };
    });
  }, [chartData, maxUnitsInChart]);

  const linePathD = React.useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, "");
  }, [chartPoints]);

  const areaPathD = React.useMemo(() => {
    if (chartPoints.length === 0) return "";
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    const bottomY = svgHeight - paddingY;
    return `${linePathD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [chartPoints, linePathD]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary select-none min-w-0">
      
      {/* 1. TOP HEADER BAR */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            Tiktok Sale Report
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Analyze SKU demand rankings, sales trends, and order volume across TikTok shops.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Shop Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Store size={14} className="text-zinc-500" />
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-800 outline-none cursor-pointer"
            >
              <option value="all">All TikTok Shops</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Export CSV"
          >
            <Download size={13} className="text-zinc-500" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadOrders(true)}
            disabled={isLoading || isSyncing}
            className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 2. CONTROLS TOOLBAR & TIME SELECTOR */}
      <div className="px-5 py-2 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
          <button
            onClick={() => setPeriodType("month")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              periodType === "month"
                ? "bg-white text-[#0B57D0] shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            By Month
          </button>
          <button
            onClick={() => setPeriodType("year")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              periodType === "year"
                ? "bg-white text-[#0B57D0] shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            By Year
          </button>
          <button
            onClick={() => setPeriodType("week")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              periodType === "week"
                ? "bg-white text-[#0B57D0] shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            By Week
          </button>
        </div>

        {/* Date Selectors according to Period Type */}
        <div className="flex items-center gap-3">
          {periodType === "month" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">Select Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#0B57D0] cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthName(m)}</option>
                ))}
              </select>
            </div>
          )}

          {periodType === "year" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">Select Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#0B57D0] cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {periodType === "week" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">Month & Week:</span>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedWeekIndex(0);
                }}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthName(m)}</option>
                ))}
              </select>
              <select
                value={selectedWeekIndex}
                onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value))}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none cursor-pointer"
              >
                {availableWeeks.map(w => (
                  <option key={w.index} value={w.index}>{w.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. INCOMPLETE DATA WARNING BANNER */}
      {incompleteDataInfo && (
        <div className="px-5 py-2 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-amber-800">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong className="font-bold">Incomplete Historical Data:</strong> Data for {formatMonthName(selectedMonth)} begins on <span className="font-bold underline">{incompleteDataInfo.startDateFormatted}</span>. Orders prior to this date are not included.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
            Partial Period
          </span>
        </div>
      )}

      {/* 4. TWO-COLUMN SPLIT VIEW CONTAINER */}
      <div className="flex-1 min-h-0 p-4 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: KPI CARDS, SMALL LINE CHART, TOP 5 RANKING   */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col gap-3.5 overflow-y-auto shrink-0 pr-1 custom-scrollbar">
          
          {/* 4 KPI Summary Cards (2x2 Compact Grid) */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            
            {/* Total Revenue */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Sales</span>
                <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0B57D0] flex items-center justify-center">
                  <DollarSign size={13} />
                </div>
              </div>
              <span className="text-base font-bold text-zinc-950 mt-1">
                ${kpiTotals.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Units Sold */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Units Sold</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package size={13} />
                </div>
              </div>
              <span className="text-base font-bold text-zinc-950 mt-1">
                {kpiTotals.totalUnits.toLocaleString("en-US")} <span className="text-xs font-normal text-zinc-500">pcs</span>
              </span>
            </div>

            {/* Total Orders */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Orders</span>
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShoppingCart size={13} />
                </div>
              </div>
              <span className="text-base font-bold text-zinc-950 mt-1">
                {kpiTotals.totalOrders.toLocaleString("en-US")}
              </span>
            </div>

            {/* Top Selling SKU */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Top SKU</span>
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp size={13} />
                </div>
              </div>
              <div className="flex flex-col mt-1 truncate">
                <span className="text-xs font-bold text-zinc-950 truncate" title={kpiTotals.topSku ? kpiTotals.topSku.seller_sku : "None"}>
                  {kpiTotals.topSku ? kpiTotals.topSku.seller_sku : "N/A"}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold truncate">
                  {kpiTotals.topSku ? `${kpiTotals.topSku.units_sold} pcs ($${kpiTotals.topSku.total_revenue.toFixed(2)})` : ""}
                </span>
              </div>
            </div>

          </div>

          {/* Small Compact Sales Trend Line Chart */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Sales Trend (Units Sold)
              </span>
              {hoveredChartPoint !== null && chartPoints[hoveredChartPoint] && (
                <span className="text-[10px] font-bold text-[#0B57D0]">
                  {chartPoints[hoveredChartPoint].label}: {chartPoints[hoveredChartPoint].units} pcs (${chartPoints[hoveredChartPoint].revenue.toFixed(2)})
                </span>
              )}
            </div>

            {/* SVG Smooth Line Graph */}
            <div className="relative w-full h-[90px] flex items-center justify-center bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden">
              {chartPoints.length === 0 || chartPoints.every(p => p.units === 0) ? (
                <span className="text-[11px] text-zinc-400 italic">No sales recorded in period</span>
              ) : (
                <svg 
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="lineTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0B57D0" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0B57D0" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Gradient Area */}
                  {areaPathD && (
                    <path d={areaPathD} fill="url(#lineTrendGradient)" />
                  )}

                  {/* Baseline hairline */}
                  <line 
                    x1={paddingX} 
                    y1={svgHeight - paddingY} 
                    x2={svgWidth - paddingX} 
                    y2={svgHeight - paddingY} 
                    stroke="#E2E8F0" 
                    strokeWidth="1" 
                  />

                  {/* Trend Line */}
                  {linePathD && (
                    <path 
                      d={linePathD} 
                      fill="none" 
                      stroke="#0B57D0" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Data Point Circles */}
                  {chartPoints.map((pt, i) => (
                    <g key={i}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredChartPoint === i ? 4.5 : (pt.units > 0 ? 2.5 : 1.5)}
                        className={`transition-all duration-150 cursor-pointer ${
                          hoveredChartPoint === i 
                            ? "fill-[#0B57D0] stroke-white stroke-2" 
                            : pt.units > 0 ? "fill-[#0B57D0]" : "fill-slate-300"
                        }`}
                        onMouseEnter={() => setHoveredChartPoint(i)}
                        onMouseLeave={() => setHoveredChartPoint(null)}
                      />
                      {/* Transparent wider hit-target for hover */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={8}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredChartPoint(i)}
                        onMouseLeave={() => setHoveredChartPoint(null)}
                      />
                    </g>
                  ))}
                </svg>
              )}
            </div>
            
            {/* Timeline label hints */}
            <div className="flex justify-between items-center text-[9px] text-zinc-400 font-medium px-1 mt-1">
              <span>{chartData[0]?.label || ""}</span>
              <span>{chartData[Math.floor(chartData.length / 2)]?.label || ""}</span>
              <span>{chartData[chartData.length - 1]?.label || ""}</span>
            </div>
          </div>

          {/* Top 5 Products Ranking Card */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Top 5 Products</span>
              <span className="text-[10px] text-zinc-400 font-semibold">By units</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {top5Products.map((sku, idx) => {
                const maxTopUnits = top5Products[0]?.units_sold || 1;
                const pct = (sku.units_sold / maxTopUnits) * 100;
                return (
                  <div 
                    key={sku.skuKey} 
                    className="flex flex-col gap-1 cursor-pointer group hover:bg-slate-50/80 p-1 rounded-md transition"
                    onClick={() => setSelectedSkuModal(sku)}
                    title={`Click to view drilldown for ${sku.seller_sku}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-900 truncate max-w-[160px] group-hover:text-[#0B57D0] transition-colors" title={sku.product_name}>
                        {idx + 1}. {sku.seller_sku !== "N/A" ? sku.seller_sku : sku.product_name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <span className="text-[11px] font-semibold text-zinc-500">
                          ${sku.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="font-bold text-[#0B57D0] text-xs">
                          {sku.units_sold} pcs
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#0B57D0] h-full rounded-full transition-all duration-300 group-hover:bg-[#0842A0]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {top5Products.length === 0 && (
                <div className="flex items-center justify-center py-4 text-xs text-zinc-400 italic">
                  No products sold in this period.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: FULL-HEIGHT INDEPENDENT SCROLLABLE SKU TABLE */}
        {/* ========================================================= */}
        <div className="flex-1 min-w-0 h-full bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          
          {/* Table Toolbar (Search & Count) */}
          <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                SKU Performance Breakdown
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0B57D0] text-[10px] font-bold">
                {processedSkus.length} SKUs
              </span>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Search SKU or Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-[#0B57D0] w-56 transition-all"
              />
            </div>
          </div>

          {/* Table Body Area with Independent Vertical Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs table-fixed min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-[#F8F9FA] shadow-[0_1px_0_0_#E2E8F0]">
                <tr className="border-b border-slate-200 text-zinc-700">
                  <th className="p-2.5 w-[50px] text-center font-bold">Image</th>
                  <th 
                    onClick={() => handleSortToggle("seller_sku")}
                    className="p-2.5 w-[20%] font-bold cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Seller SKU</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th className="p-2.5 w-[32%] font-bold">Product & Variant Name</th>
                  <th 
                    onClick={() => handleSortToggle("units_sold")}
                    className="p-2.5 w-[14%] font-bold text-right cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Units Sold</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortToggle("orders_count")}
                    className="p-2.5 w-[12%] font-bold text-right cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Orders</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortToggle("total_revenue")}
                    className="p-2.5 w-[14%] font-bold text-right cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Revenue ($)</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th className="p-2.5 w-[50px] text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-zinc-400 italic">
                      Loading sales report data...
                    </td>
                  </tr>
                ) : processedSkus.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-zinc-400 italic">
                      No SKU records found matching your selection.
                    </td>
                  </tr>
                ) : (
                  processedSkus.map((sku) => (
                    <tr 
                      key={sku.skuKey}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition duration-150"
                    >
                      {/* Image Thumbnail */}
                      <td className="p-2.5 text-center align-middle">
                        {sku.sku_image ? (
                          <img
                            src={sku.sku_image}
                            alt="SKU"
                            className="w-8 h-8 rounded-md border border-slate-200 object-cover mx-auto"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center text-[9px] text-zinc-400 font-bold mx-auto">
                            N/A
                          </div>
                        )}
                      </td>

                      {/* Seller SKU */}
                      <td className="p-2.5 align-middle font-mono font-bold text-zinc-900 truncate">
                        {sku.seller_sku}
                      </td>

                      {/* Product Name & Variant */}
                      <td className="p-2.5 align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 truncate" title={sku.product_name}>
                            {sku.product_name}
                          </span>
                          {sku.sku_name && sku.sku_name !== "-" && (
                            <span className="text-[10px] text-zinc-500 font-medium truncate">
                              Variant: {sku.sku_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Units Sold */}
                      <td className="p-2.5 align-middle text-right font-bold text-zinc-950">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#0B57D0] text-xs">
                          {sku.units_sold.toLocaleString()} pcs
                        </span>
                      </td>

                      {/* Orders Count */}
                      <td className="p-2.5 align-middle text-right font-semibold text-zinc-700">
                        {sku.orders_count.toLocaleString()}
                      </td>

                      {/* Total Revenue */}
                      <td className="p-2.5 align-middle text-right font-bold text-zinc-950">
                        ${sku.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Action */}
                      <td className="p-2.5 align-middle text-center">
                        <button
                          onClick={() => setSelectedSkuModal(sku)}
                          className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-zinc-600 hover:text-[#0B57D0] transition cursor-pointer"
                          title="View Orders"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sticky Table Footer Summary */}
          <div className="px-4 py-2.5 border-t border-slate-200 bg-[#F8F9FA] flex items-center justify-between text-xs text-zinc-600 font-medium shrink-0">
            <span>
              Showing {processedSkus.length} of {skuSummaries.length} total SKUs
            </span>
            <div className="flex items-center gap-4">
              <span>Total Units: <strong className="text-zinc-950">{kpiTotals.totalUnits} pcs</strong></span>
              <span>Total Sales: <strong className="text-zinc-950">${kpiTotals.totalRevenue.toFixed(2)}</strong></span>
            </div>
          </div>

        </div>

      </div>

      {/* 5. SKU DRILLDOWN MODAL POPUP */}
      {selectedSkuModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none font-primary">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                {selectedSkuModal.sku_image ? (
                  <img src={selectedSkuModal.sku_image} alt="SKU" className="w-10 h-10 rounded-lg border border-slate-200 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-zinc-400">
                    N/A
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 truncate max-w-md">
                    {selectedSkuModal.seller_sku}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate max-w-md">
                    {selectedSkuModal.product_name} {selectedSkuModal.sku_name !== "-" ? `(${selectedSkuModal.sku_name})` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSkuModal(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-3 gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Units Sold</span>
                <span className="font-bold text-zinc-900 text-sm">{selectedSkuModal.units_sold} pcs</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Total Orders</span>
                <span className="font-bold text-zinc-900 text-sm">{selectedSkuModal.orders_count} orders</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Total Sales</span>
                <span className="font-bold text-[#0B57D0] text-sm">${selectedSkuModal.total_revenue.toFixed(2)}</span>
              </div>
            </div>

            {/* Orders List Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 custom-scrollbar">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                Recent Orders Containing this SKU ({selectedSkuModal.orders.length})
              </h4>

              {selectedSkuModal.orders.map((ord, idx) => {
                const dateStr = new Date(ord.create_time * 1000).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-900">{ord.order_id}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">{dateStr}</span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        Recipient: <strong>{ord.recipient_name}</strong> | Tracking: <span className="font-mono">{ord.tracking_number}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#0B57D0] font-bold text-xs">
                        Qty: {ord.quantity}
                      </span>
                      <span className="font-bold text-zinc-900">
                        ${(ord.quantity * parseFloat(ord.sale_price)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedSkuModal(null)}
                className="h-9 px-4 bg-[#0B57D0] text-white text-xs font-semibold rounded-lg hover:bg-[#0842A0] transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
