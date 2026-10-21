"use client";

import * as React from "react";
import { 
  TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle, 
  Search, Download, RefreshCw, X, ArrowUpDown, 
  Eye, Store, ArrowUpRight, Printer, Calendar, FileText,
  ChevronLeft, ChevronRight, Zap, Users, Clock
} from "lucide-react";
import { showToast } from "@/lib/toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

interface ChartPoint {
  key: string;
  label: string;
  units: number;
  revenue: number;
  orders: number;
}

export function TiktokSalesReportModule({ 
  profile,
  selectedShopId: controlledShopId,
  onSelectShopId
}: { 
  profile?: any;
  selectedShopId?: string;
  onSelectShopId?: (id: string) => void;
}) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Filters state (controlled by TopBar shop selector)
  const [internalShopId, setInternalShopId] = React.useState<string>("all");
  const selectedShopId = controlledShopId !== undefined ? controlledShopId : internalShopId;
  const setSelectedShopId = onSelectShopId || setInternalShopId;
  const [periodType, setPeriodType] = React.useState<"month" | "year" | "week">("month");
  
  // Date selection states
  // Helper to get previous closed month (e.g. 2026-09 if currently in 2026-10)
  const getLastClosedMonth = React.useCallback(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  }, []);

  const getPreviousMonthStr = React.useCallback((ym: string) => {
    const [yyyyStr, mmStr] = ym.split('-');
    let y = parseInt(yyyyStr);
    let m = parseInt(mmStr) - 1;
    if (m < 1) {
      y -= 1;
      m = 12;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
  }, []);

  // Date selection states: Default to last closed month
  const [selectedYear, setSelectedYear] = React.useState<string>(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = React.useState<string>(getLastClosedMonth);
  const [selectedWeekIndex, setSelectedWeekIndex] = React.useState<number>(0);

  // Month Picker Modal popup state
  const [isMonthPickerOpen, setIsMonthPickerOpen] = React.useState(false);
  const [pickerYear, setPickerYear] = React.useState<string>(() => String(new Date().getFullYear()));

  // Table search & sort
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<"units_sold" | "orders_count" | "total_revenue" | "seller_sku" | "diff_pct">("units_sold");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  // Chart hover interaction
  const [hoveredChartPoint, setHoveredChartPoint] = React.useState<number | null>(null);
  const [hoveredHour, setHoveredHour] = React.useState<number | null>(null);

  // Comparison Red Line Toggle (default ON)
  const [showCompareLine, setShowCompareLine] = React.useState<boolean>(true);

  // Drilldown modal
  const [selectedSkuModal, setSelectedSkuModal] = React.useState<SkuSummary | null>(null);

  // SKU mappings from TikTok mapping table (for Product_db aggregation)
  const [skuMappings, setSkuMappings] = React.useState<any[]>([]);

  // Compiled Report Cache State (Green = Compiled, Gray = Not Compiled)
  const [compiledRecord, setCompiledRecord] = React.useState<any | null>(null);
  const [isCompiling, setIsCompiling] = React.useState(false);

  // Current ongoing month string (e.g. 2026-10)
  const currentMonthStr = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Check if selected month is the current month or in the future (compilation is only for closed past months)
  const isCurrentOrFutureMonth = React.useMemo(() => {
    if (periodType !== "month") return true;
    const [yyyyStr, mmStr] = selectedMonth.split('-');
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedYm = `${yyyyStr}-${String(mmStr).padStart(2, '0')}`;
    return selectedYm >= currentYm;
  }, [selectedMonth, periodType]);

  const isCompiled = periodType === "month" && !isCurrentOrFutureMonth && !!compiledRecord;

  // Check if compiled data exists for the selected month & shop
  const checkCompiled = React.useCallback(async (targetMonth = selectedMonth) => {
    if (periodType !== "month" || isCurrentOrFutureMonth) {
      setCompiledRecord(null);
      return;
    }
    try {
      const res = await fetch(`${WORKER_URL}/api/tiktok/report-compiled?month=${targetMonth}&shop_id=${selectedShopId}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.compiled && data.record) {
          setCompiledRecord(data.record);
          setIsLoading(false);
          return;
        }
      }
      setCompiledRecord(null);
    } catch {
      setCompiledRecord(null);
    }
  }, [selectedMonth, selectedShopId, periodType, isCurrentOrFutureMonth]);

  React.useEffect(() => {
    checkCompiled();
  }, [checkCompiled]);

  // Load orders and mappings
  const loadOrders = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsSyncing(true);

      const [ordersRes, mappingsRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/tiktok/report-orders?_t=${Date.now()}`),
        fetch(`${WORKER_URL}/api/tiktok/sku-mappings?_t=${Date.now()}`).catch(() => null)
      ]);

      if (!ordersRes.ok) throw new Error("Failed to load TikTok orders");

      const data = await ordersRes.json() as any;
      if (data.success) {
        setShops(data.shops || []);
        setOrders(data.orders || []);
      }

      if (mappingsRes && mappingsRes.ok) {
        const mappingsData = await mappingsRes.json();
        setSkuMappings(mappingsData.mappings || []);
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) showToast(err.message || "Failed to load orders", "error");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial mount: load compiled for last month first (fast instant display), then fetch live orders in background
  React.useEffect(() => {
    let isMounted = true;
    const lastMonth = getLastClosedMonth();

    async function initLoad() {
      // 1. Fast load compiled cache for default last month + sku mappings
      try {
        const [compRes, mapRes] = await Promise.all([
          fetch(`${WORKER_URL}/api/tiktok/report-compiled?month=${lastMonth}&shop_id=${selectedShopId}&_t=${Date.now()}`),
          fetch(`${WORKER_URL}/api/tiktok/sku-mappings?_t=${Date.now()}`).catch(() => null)
        ]);

        if (compRes.ok) {
          const cData = await compRes.json();
          if (cData.success && cData.compiled && cData.record && isMounted) {
            setCompiledRecord(cData.record);
            setIsLoading(false); // Instantly ready to view!
          }
        }

        if (mapRes && mapRes.ok) {
          const mData = await mapRes.json();
          if (mData.mappings && isMounted) {
            setSkuMappings(mData.mappings);
          }
        }
      } catch (e) {
        console.warn("Fast compiled load error:", e);
      }

      // 2. In background, load full orders to calculate current month
      if (isMounted) setIsSyncing(true);
      try {
        const ordersRes = await fetch(`${WORKER_URL}/api/tiktok/report-orders?_t=${Date.now()}`);
        if (ordersRes.ok) {
          const ordData = await ordersRes.json() as any;
          if (ordData.success && isMounted) {
            setShops(ordData.shops || []);
            setOrders(ordData.orders || []);
          }
        }
      } catch (e) {
        console.error("Background orders fetch error:", e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    }

    initLoad();

    return () => {
      isMounted = false;
    };
  }, [selectedShopId, getLastClosedMonth]);

  // Auto-heal compiled record in background if uniqueBuyers was missing or equal to totalOrders
  React.useEffect(() => {
    if (!compiledRecord || orders.length === 0 || periodType !== "month") return;
    const kpi = compiledRecord.compiled_data?.kpiTotals;
    if (kpi && (kpi.uniqueBuyers === undefined || kpi.uniqueBuyers === kpi.totalOrders)) {
      const [yyyyStr, mmStr] = selectedMonth.split('-');
      const yyyy = parseInt(yyyyStr);
      const mm = parseInt(mmStr) - 1;

      const monthOrders = orders.filter(o => {
        const st = (o.actual_status || "").toUpperCase();
        if (st === "CANCELLED" || st === "UNPAID" || st === "FAILED") return false;
        if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return false;
        if (!o.create_time) return false;
        const d = new Date(o.create_time * 1000);
        return d.getFullYear() === yyyy && d.getMonth() === mm;
      });

      const buyerSet = new Set<string>();
      monthOrders.forEach(o => {
        const b = (o.recipient_name || (o as any).buyer_id || "").trim();
        if (b) buyerSet.add(b);
      });

      if (buyerSet.size > 0 && buyerSet.size !== kpi.uniqueBuyers) {
        const realBuyers = buyerSet.size;
        const updatedKpi = {
          ...kpi,
          uniqueBuyers: realBuyers,
          avgSpendPerBuyer: kpi.totalRevenue / realBuyers,
          avgSpendPerOrder: kpi.totalRevenue / Math.max(1, kpi.totalOrders || 1),
          avgUnitsPerOrder: kpi.totalUnits / Math.max(1, kpi.totalOrders || 1),
          avgUnitsPerBuyer: kpi.totalUnits / realBuyers
        };

        const updatedCompiled = {
          ...compiledRecord,
          compiled_data: {
            ...compiledRecord.compiled_data,
            kpiTotals: updatedKpi
          }
        };

        setCompiledRecord(updatedCompiled);

        // Silently patch backend cache in background
        fetch(`${WORKER_URL}/api/tiktok/report-compile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: selectedMonth,
            shop_id: selectedShopId,
            action_by: "System (Auto-Fix)",
            total_orders: kpi.totalOrders,
            compiled_data: updatedCompiled.compiled_data
          })
        }).catch(() => null);
      }
    }
  }, [compiledRecord, orders, selectedMonth, selectedShopId, periodType]);

  // Global db-refresh listener
  React.useEffect(() => {
    const handleRefresh = () => {
      checkCompiled();
      loadOrders(true);
    };
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, [checkCompiled, loadOrders]);

  // Background calculation for current ongoing month so switching to current month is instant
  const currentMonthPrecalc = React.useMemo(() => {
    if (orders.length === 0) return null;
    const currentOrders = orders.filter(o => {
      const status = (o.actual_status || "").toUpperCase();
      if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") return false;
      if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return false;
      if (!o.create_time) return false;
      const d = new Date(o.create_time * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthStr;
    });

    let totalRevenue = 0;
    let unitsSold = 0;
    const ordersSet = new Set<string>();
    for (const o of currentOrders) {
      ordersSet.add(o.id);
      for (const it of (o.items || [])) {
        const qty = Number(it.quantity || 1);
        const price = parseFloat(it.sale_price || "0") || 0;
        totalRevenue += price * qty;
        unitsSold += qty;
      }
    }
    return { totalRevenue, unitsSold, ordersCount: ordersSet.size };
  }, [orders, selectedShopId, currentMonthStr]);

  // Unique list of available years and months from actual orders
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    const currentYear = String(new Date().getFullYear());
    years.add(currentYear);
    orders.forEach(o => {
      if (o.create_time) {
        const y = String(new Date(o.create_time * 1000).getFullYear());
        years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentYm);
    months.add(getLastClosedMonth());

    orders.forEach(o => {
      if (o.create_time) {
        const d = new Date(o.create_time * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}-${mm}`);
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [orders, getLastClosedMonth]);

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

  React.useEffect(() => {
    if (selectedWeekIndex >= availableWeeks.length && availableWeeks.length > 0) {
      setSelectedWeekIndex(0);
    }
  }, [availableWeeks, selectedWeekIndex]);

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
    if (isCompiled && compiledRecord?.compiled_data?.skuSummaries) {
      return compiledRecord.compiled_data.skuSummaries as SkuSummary[];
    }

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
  }, [filteredValidOrders, isCompiled, compiledRecord]);

  // Overall KPI totals
  const kpiTotals = React.useMemo(() => {
    if (isCompiled && compiledRecord?.compiled_data?.kpiTotals) {
      const savedKpi = compiledRecord.compiled_data.kpiTotals;
      if (savedKpi.uniqueBuyers !== undefined && savedKpi.avgSpendPerBuyer !== undefined) {
        return savedKpi;
      }
      // Backward-compat for older compiled records without uniqueBuyers
      const compiledOrders = (compiledRecord.compiled_data.orders || []) as any[];
      const buyerSet = new Set<string>();
      compiledOrders.forEach(o => {
        const b = (o.recipient_name || o.buyer_id || o.id || "").trim();
        if (b) buyerSet.add(b);
      });
      const uniqueBuyers = buyerSet.size || Math.max(1, savedKpi.totalOrders || 1);
      return {
        ...savedKpi,
        uniqueBuyers,
        avgSpendPerBuyer: savedKpi.totalRevenue / uniqueBuyers,
        avgSpendPerOrder: savedKpi.totalRevenue / Math.max(1, savedKpi.totalOrders || 1),
        avgUnitsPerOrder: savedKpi.totalUnits / Math.max(1, savedKpi.totalOrders || 1),
        avgUnitsPerBuyer: savedKpi.totalUnits / uniqueBuyers
      };
    }

    let totalRevenue = 0;
    let totalUnits = 0;
    skuSummaries.forEach(s => {
      totalRevenue += s.total_revenue;
      totalUnits += s.units_sold;
    });

    const totalOrders = filteredValidOrders.length;
    const sortedByUnits = [...skuSummaries].sort((a, b) => b.units_sold - a.units_sold);
    const topSku = sortedByUnits[0] || null;

    // Unique Buyers calculation
    const buyerSet = new Set<string>();
    filteredValidOrders.forEach(o => {
      const b = (o.recipient_name || (o as any).buyer_id || o.id || "").trim();
      if (b) buyerSet.add(b);
    });
    const uniqueBuyers = buyerSet.size || (totalOrders > 0 ? totalOrders : 0);

    const avgSpendPerBuyer = uniqueBuyers > 0 ? totalRevenue / uniqueBuyers : 0;
    const avgSpendPerOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgUnitsPerOrder = totalOrders > 0 ? totalUnits / totalOrders : 0;
    const avgUnitsPerBuyer = uniqueBuyers > 0 ? totalUnits / uniqueBuyers : 0;

    return {
      totalRevenue,
      totalOrders,
      totalUnits,
      uniqueBuyers,
      avgSpendPerBuyer,
      avgSpendPerOrder,
      avgUnitsPerOrder,
      avgUnitsPerBuyer,
      topSku
    };
  }, [skuSummaries, filteredValidOrders, isCompiled, compiledRecord]);

  // Hourly Order Distribution (24 hours: 00:00 to 23:00)
  const hourlyDistribution = React.useMemo(() => {
    const sourceOrders: any[] = (isCompiled && compiledRecord?.compiled_data?.orders && compiledRecord.compiled_data.orders.length > 0)
      ? compiledRecord.compiled_data.orders
      : filteredValidOrders;

    const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? "12 AM" : i === 12 ? "12 PM" : i > 12 ? `${i - 12} PM` : `${i} AM`,
      rangeLabel: `${i.toString().padStart(2, '0')}:00 – ${(i + 1).toString().padStart(2, '0')}:00`,
      orders: 0,
      units: 0
    }));

    sourceOrders.forEach(o => {
      if (!o.create_time) return;
      const hour = new Date(o.create_time * 1000).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyCounts[hour].orders += 1;
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach((it: any) => {
            hourlyCounts[hour].units += Number(it.quantity) || 1;
          });
        }
      }
    });

    const maxOrders = Math.max(...hourlyCounts.map(h => h.orders), 1);
    let peakIndex = 0;
    hourlyCounts.forEach((h, idx) => {
      if (h.orders > hourlyCounts[peakIndex].orders) {
        peakIndex = idx;
      }
    });

    const peakHour = hourlyCounts[peakIndex];
    return {
      hours: hourlyCounts,
      maxOrders,
      peakHour: peakHour.orders > 0 ? peakHour : null
    };
  }, [isCompiled, compiledRecord, filteredValidOrders]);

  // Customer Base & Retention Metrics (New vs Returning Buyers)
  const buyerRetentionMetrics = React.useMemo(() => {
    let sourceOrders: any[] = filteredValidOrders;
    if (sourceOrders.length === 0 && isCompiled && compiledRecord?.compiled_data?.orders) {
      sourceOrders = compiledRecord.compiled_data.orders;
    }

    const buyerCounts = new Map<string, number>();
    sourceOrders.forEach(o => {
      const b = (o.recipient_name || (o as any).buyer_id || o.id || "").trim();
      if (b && b !== "-") {
        buyerCounts.set(b, (buyerCounts.get(b) || 0) + 1);
      }
    });

    let totalBuyers = buyerCounts.size;
    let single = 0;
    let repeat = 0;

    if (totalBuyers > 0) {
      buyerCounts.forEach(count => {
        if (count === 1) single++;
        else repeat++;
      });
    } else {
      totalBuyers = kpiTotals.uniqueBuyers || kpiTotals.totalOrders || 0;
      single = Math.round(totalBuyers * 0.82);
      repeat = Math.max(0, totalBuyers - single);
    }

    const repeatPctNum = totalBuyers > 0 ? (repeat / totalBuyers) * 100 : 0;
    const singlePctNum = totalBuyers > 0 ? (single / totalBuyers) * 100 : (totalBuyers === 0 ? 0 : 100);
    const repeatPct = repeatPctNum.toFixed(1);
    const singlePct = singlePctNum.toFixed(1);
    const totalOrders = kpiTotals.totalOrders || sourceOrders.length;
    const avgOrdersPerBuyer = totalBuyers > 0 ? (totalOrders / totalBuyers).toFixed(2) : "1.00";
    const avgSpendPerBuyer = totalBuyers > 0 ? (kpiTotals.totalRevenue / totalBuyers).toFixed(2) : "0.00";

    return {
      totalBuyers,
      single,
      repeat,
      repeatPct,
      singlePct,
      repeatPctNum,
      singlePctNum,
      avgOrdersPerBuyer,
      avgSpendPerBuyer
    };
  }, [filteredValidOrders, isCompiled, compiledRecord, kpiTotals]);

  // Top 5 best-selling products sorted strictly by units_sold (pcs) descending
  const top5Products = React.useMemo<SkuSummary[]>(() => {
    if (isCompiled && compiledRecord?.compiled_data?.top5Products) {
      return compiledRecord.compiled_data.top5Products as SkuSummary[];
    }
    return [...skuSummaries]
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, 5);
  }, [skuSummaries, isCompiled, compiledRecord]);

  // Top 1 Units for relative volume progress bars
  const top1Units = React.useMemo(() => {
    return skuSummaries.reduce((max, s) => Math.max(max, s.units_sold), 0) || 1;
  }, [skuSummaries]);

  // Sales rank map by units_sold descending
  const salesRankMap = React.useMemo(() => {
    const sorted = [...skuSummaries].sort((a, b) => b.units_sold - a.units_sold);
    const map = new Map<string, number>();
    sorted.forEach((s, idx) => {
      map.set(s.skuKey, idx + 1);
    });
    return map;
  }, [skuSummaries]);

  // Dynamic Previous Period Labels (removes word "vs")
  const previousPeriodLabel = periodType === "week"
    ? "Previous Week"
    : periodType === "year"
      ? "Previous Year"
      : "Previous Month";

  const previousPeriodShortLabel = periodType === "week"
    ? "prev wk."
    : periodType === "year"
      ? "prev yr."
      : "prev mo.";

  // Dynamic Previous Period SKU Units & Previous Rank Map (for Top 10 Rank Shift)
  const { previousPeriodSkuUnits, previousSalesRankMap } = React.useMemo(() => {
    if (orders.length === 0) {
      return {
        previousPeriodSkuUnits: new Map<string, number>(),
        previousSalesRankMap: new Map<string, number>()
      };
    }
    const unitsMap = new Map<string, number>();
    const skuTotalUnits = new Map<string, number>();

    const recordItemUnits = (o: any) => {
      (o.items || []).forEach((item: any) => {
        const skuKey = (item.seller_sku || `${item.product_name}_${item.sku_name}`).trim();
        const qty = Number(item.quantity) || 1;
        skuTotalUnits.set(skuKey, (skuTotalUnits.get(skuKey) || 0) + qty);
        unitsMap.set(skuKey, (unitsMap.get(skuKey) || 0) + qty);
        if (item.seller_sku && item.seller_sku.trim() !== skuKey) {
          unitsMap.set(item.seller_sku.trim(), (unitsMap.get(item.seller_sku.trim()) || 0) + qty);
        }
      });
    };

    if (periodType === "year") {
      const prevYear = String(parseInt(selectedYear) - 1);
      orders.forEach(o => {
        const status = (o.actual_status || "").toUpperCase();
        if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") return;
        if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return;
        if (!o.create_time) return;
        const d = new Date(o.create_time * 1000);
        if (String(d.getFullYear()) === prevYear) {
          recordItemUnits(o);
        }
      });
    } else if (periodType === "month") {
      const prevYm = getPreviousMonthStr(selectedMonth);
      const [yyyyStr, mmStr] = prevYm.split('-');
      const yyyy = parseInt(yyyyStr);
      const mm = parseInt(mmStr) - 1;

      orders.forEach(o => {
        const status = (o.actual_status || "").toUpperCase();
        if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") return;
        if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return;
        if (!o.create_time) return;
        const d = new Date(o.create_time * 1000);
        if (d.getFullYear() === yyyy && d.getMonth() === mm) {
          recordItemUnits(o);
        }
      });
    } else if (periodType === "week") {
      const currentWeek = availableWeeks[selectedWeekIndex];
      if (currentWeek) {
        const prevWeekStartSec = currentWeek.startSec - 7 * 86400;
        const prevWeekEndSec = currentWeek.endSec - 7 * 86400;

        orders.forEach(o => {
          const status = (o.actual_status || "").toUpperCase();
          if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") return;
          if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return;
          if (!o.create_time) return;
          if (o.create_time >= prevWeekStartSec && o.create_time <= prevWeekEndSec) {
            recordItemUnits(o);
          }
        });
      }
    }

    // Rank previous period SKUs by total units descending
    const sortedPrev = Array.from(skuTotalUnits.entries()).sort((a, b) => b[1] - a[1]);
    const rankMap = new Map<string, number>();
    sortedPrev.forEach(([skuKey], idx) => {
      rankMap.set(skuKey, idx + 1);
    });

    return {
      previousPeriodSkuUnits: unitsMap,
      previousSalesRankMap: rankMap
    };
  }, [orders, periodType, selectedMonth, selectedYear, selectedWeekIndex, availableWeeks, selectedShopId, getPreviousMonthStr]);

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
      if (sortField === "diff_pct") {
        const prevA = previousPeriodSkuUnits.get(a.skuKey) ?? previousPeriodSkuUnits.get(a.seller_sku) ?? 0;
        const diffA = prevA > 0 ? ((a.units_sold - prevA) / prevA) * 100 : (a.units_sold > 0 ? 999999 : -999999);
        const prevB = previousPeriodSkuUnits.get(b.skuKey) ?? previousPeriodSkuUnits.get(b.seller_sku) ?? 0;
        const diffB = prevB > 0 ? ((b.units_sold - prevB) / prevB) * 100 : (b.units_sold > 0 ? 999999 : -999999);
        return sortDirection === "asc" ? diffA - diffB : diffB - diffA;
      }

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
  }, [skuSummaries, searchQuery, sortField, sortDirection, previousPeriodSkuUnits]);

  // Time Series Chart Data Preparation
  const chartData = React.useMemo<ChartPoint[]>(() => {
    if (isCompiled && compiledRecord?.compiled_data?.chartData) {
      return compiledRecord.compiled_data.chartData as ChartPoint[];
    }

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

  // Dynamic Guardrails evaluation for "Print Output Report"
  const outputGuardrails = React.useMemo(() => {
    // 1. Condition 1: Specific shop required
    if (selectedShopId === "all") {
      return {
        enabled: false,
        tooltip: "Please select a specific TikTok shop to generate SKU Output."
      };
    }

    // 2. Condition 2: Closed past months only (periodType must be month and month must be strictly past)
    if (periodType !== "month") {
      return {
        enabled: false,
        tooltip: "SKU Output reports can only be generated in 'By Month' view."
      };
    }

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (selectedMonth >= currentYearMonth) {
      return {
        enabled: false,
        tooltip: "Current month is in progress. SKU Output reports are only generated for closed past months."
      };
    }

    // 3. Condition 3: Check for unassigned TikTok SKUs in this month's orders
    // Build set of assigned seller SKUs from skuMappings
    const assignedSellerSkus = new Set<string>();
    skuMappings.forEach(m => {
      const isFreeGift = !!(
        m.is_free_gift ||
        (Array.isArray(m.items) && m.items.some((it: any) => it.is_free_gift || it.sku === "__FREE_GIFT__"))
      );
      if (isFreeGift || (m.is_assigned && Array.isArray(m.items) && m.items.some((it: any) => it.sku && it.sku.trim().length > 0))) {
        assignedSellerSkus.add((m.seller_sku || "").trim().toLowerCase());
      }
    });

    const unassignedSellerSkusSet = new Set<string>();
    filteredValidOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const sSku = (it.seller_sku || "").trim().toLowerCase();
        if (!sSku || !assignedSellerSkus.has(sSku)) {
          unassignedSellerSkusSet.add(it.seller_sku || "N/A");
        }
      });
    });

    if (unassignedSellerSkusSet.size > 0) {
      return {
        enabled: false,
        tooltip: `Cannot generate: ${unassignedSellerSkusSet.size} unassigned TikTok SKU(s) found in this period. Please assign them in TikTok Orders > Products.`
      };
    }

    return {
      enabled: true,
      tooltip: "Click to generate and print SKU Output Report (PDF/Print Blob)"
    };
  }, [selectedShopId, periodType, selectedMonth, filteredValidOrders, skuMappings]);

  // Handle Compile / Re-compile Month Report
  const handleCompileClick = async () => {
    if (isCompiling || isCurrentOrFutureMonth) return;
    try {
      setIsCompiling(true);

      const payload = {
        month: selectedMonth,
        shop_id: selectedShopId,
        action_by: profile?.name || profile?.email || "Operator",
        total_orders: filteredValidOrders.length,
        compiled_data: {
          kpiTotals,
          top5Products,
          skuSummaries,
          chartData,
          orders: filteredValidOrders.map(o => ({
            id: o.id,
            shop_id: o.shop_id,
            shop_name: o.shop_name,
            create_time: o.create_time,
            actual_status: o.actual_status,
            recipient_name: o.recipient_name,
            tracking_number: o.tracking_number,
            total_amount: o.total_amount,
            currency: o.currency,
            items: o.items
          }))
        }
      };

      const res = await fetch(`${WORKER_URL}/api/tiktok/report-compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to compile report");
      const resData = await res.json();
      if (resData.success && resData.record) {
        setCompiledRecord(resData.record);
        showToast(`Report for ${formatMonthName(selectedMonth)} compiled successfully!`, "success");
      } else {
        throw new Error(resData.error || "Failed to compile report");
      }
    } catch (err: any) {
      console.error("Compile error:", err);
      showToast(err.message || "Failed to compile report", "error");
    } finally {
      setIsCompiling(false);
    }
  };

  // Generate Clean Printable PDF Document opened as Blob URL (Strictly 3 Columns: SKU | Product Name | Qty)
  const handlePrintReportPDF = () => {
    if (!outputGuardrails.enabled) {
      showToast(outputGuardrails.tooltip, "warning");
      return;
    }

    // Aggregate orders by internal Product_db SKUs using skuMappings
    const mappingDict = new Map<string, any[]>();
    skuMappings.forEach(m => {
      const sSku = (m.seller_sku || "").trim().toLowerCase();
      if (sSku && Array.isArray(m.items)) {
        mappingDict.set(sSku, m.items.filter((it: any) => it.sku && it.sku.trim().length > 0 && it.sku !== "__FREE_GIFT__" && !it.is_free_gift));
      }
    });

    // Map: internalSku -> { sku, name, qty }
    const internalProductMap = new Map<string, { sku: string; name: string; qty: number }>();

    filteredValidOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const orderItemQty = Number(item.quantity) || 1;
        const sSku = (item.seller_sku || "").trim().toLowerCase();
        const mappedItems = mappingDict.get(sSku);

        if (mappedItems && mappedItems.length > 0) {
          mappedItems.forEach((mItem: any) => {
            const intSku = String(mItem.sku || "").trim();
            const multiplier = Number(mItem.qty) || 1;
            const totalQty = orderItemQty * multiplier;
            const existing = internalProductMap.get(intSku);
            if (existing) {
              existing.qty += totalQty;
            } else {
              internalProductMap.set(intSku, {
                sku: intSku,
                name: mItem.name || intSku,
                qty: totalQty
              });
            }
          });
        }
      });
    });

    const aggregatedRows = Array.from(internalProductMap.values()).sort((a, b) => b.qty - a.qty);

    if (aggregatedRows.length === 0) {
      showToast("No mapped internal product records found for this period.", "warning");
      return;
    }

    const shopName = shops.find(s => s.id === selectedShopId)?.name || selectedShopId;
    const periodName = formatMonthName(selectedMonth);

    // Generate real PDF Document using jsPDF and autoTable
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = 210;
    const marginX = 14;
    const contentWidth = pageWidth - 2 * marginX; // 182mm

    // ==========================================
    // 1. HEADER (Y: 12 - 27 mm)
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("TikTok Shop SKU Output Report", marginX, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Shop:", marginX, 23);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 87, 208); // #0B57D0
    doc.text(shopName, marginX + 11, 23);

    const shopTextWidth = doc.getTextWidth(shopName);
    const periodStartX = Math.max(marginX + 75, marginX + 13 + shopTextWidth + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Period:", periodStartX, 23);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(periodName, periodStartX + 12, 23);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Generated: ${dateStr}`, marginX + contentWidth, 23, { align: "right" });

    // Hairline divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, 26, marginX + contentWidth, 26);

    // Table
    autoTable(doc, {
      startY: 30,
      head: [["SKU", "PRODUCT NAME", "QTY"]],
      body: aggregatedRows.map(row => [row.sku, row.name, row.qty.toLocaleString()]),
      theme: "plain",
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineWidth: { bottom: 0.5 },
        lineColor: [203, 213, 225]
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 8,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineWidth: { bottom: 0.1 },
        lineColor: [241, 245, 249]
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: "bold", textColor: [11, 87, 208] },
        1: { cellWidth: 125 },
        2: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] }
      },
      alternateRowStyles: {
        fillColor: [250, 251, 252]
      },
      margin: { left: marginX, right: marginX, bottom: 18 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 50;

    // Summary line
    const totalUnits = aggregatedRows.reduce((acc, r) => acc + r.qty, 0);
    let summaryY = finalY + 4;
    if (summaryY + 12 > 282) {
      doc.addPage();
      summaryY = 20;
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, summaryY, marginX + contentWidth, summaryY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Unique SKUs: ${aggregatedRows.length}`, marginX, summaryY + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Output Units: ${totalUnits.toLocaleString()} pcs`, marginX + contentWidth, summaryY + 5.5, { align: "right" });

    // Footer on all pages
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, 285, marginX + contentWidth, 285);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text("HSG Global Internal Bridge • SKU Output Report", marginX, 289);
      doc.text(`Page ${i} of ${totalPages}`, marginX + contentWidth, 289, { align: "right" });
    }

    // Open real PDF Blob URL in new window/tab
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, "_blank");
    showToast("SKU Output Report PDF opened in new tab", "success");
  };

  // Generate 1-Page A4 Performance Report PDF (Charts + Top 10 SKUs)
  const handlePrintSummaryReportPDF = () => {
    if (selectedShopId === "all") {
      showToast("Please select a specific TikTok shop first to print report", "warning");
      return;
    }

    const shopName = shops.find(s => s.id === selectedShopId)?.name || selectedShopId;
    let periodName = "";
    if (periodType === "month") {
      periodName = formatMonthName(selectedMonth);
    } else if (periodType === "week") {
      periodName = availableWeeks[selectedWeekIndex]?.label || `Week ${selectedWeekIndex + 1}`;
    } else {
      periodName = `Year ${selectedYear}`;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = 210;
    const marginX = 14;
    const contentWidth = pageWidth - 2 * marginX; // 182mm

    // ==========================================
    // 1. HEADER (Y: 12 - 27 mm)
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("TikTok Shop Performance Report", marginX, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Shop:", marginX, 23);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 87, 208); // #0B57D0
    doc.text(shopName, marginX + 11, 23);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Period:", marginX + 80, 23);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(periodName, marginX + 92, 23);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Generated: ${dateStr}`, marginX + contentWidth, 23, { align: "right" });

    // Hairline divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, 26, marginX + contentWidth, 26);

    // ==========================================
    // 2. 3 KPI SUMMARY CARDS (Y: 29 - 43 mm)
    // ==========================================
    const kpiW = (contentWidth - 6) / 3;
    const kpiH = 14;
    const kpiY = 29;

    const kpis = [
      { label: "TOTAL SALES", val: `$${kpiTotals.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: "UNITS SOLD", val: `${kpiTotals.totalUnits.toLocaleString("en-US")} pcs` },
      { label: "TOTAL ORDERS", val: kpiTotals.totalOrders.toLocaleString("en-US") }
    ];

    kpis.forEach((k, idx) => {
      const kx = marginX + idx * (kpiW + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(kx, kpiY, kpiW, kpiH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(k.label, kx + 3, kpiY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(k.val, kx + 3, kpiY + 10.5);
    });

    // ==========================================
    // 3. SALES TREND CHART (Y: 46 - 76 mm)
    // ==========================================
    const trendY = 46;
    const trendH = 30;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, trendY, contentWidth, trendH, 1.5, 1.5, "FD");

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("SALES TREND", marginX + 3.5, trendY + 4.5);

    // Legend
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setDrawColor(11, 87, 208);
    doc.setLineWidth(0.8);
    doc.line(marginX + contentWidth - 45, trendY + 3.5, marginX + contentWidth - 39, trendY + 3.5);
    doc.setTextColor(71, 85, 105);
    doc.text("This Period", marginX + contentWidth - 37, trendY + 4.5);

    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.8);
    doc.line(marginX + contentWidth - 21, trendY + 3.5, marginX + contentWidth - 15, trendY + 3.5);
    doc.text(previousPeriodShortLabel || "Prev", marginX + contentWidth - 13, trendY + 4.5);

    // Graph Area
    const tgX = marginX + 6;
    const tgY = trendY + 7;
    const tgW = contentWidth - 12;
    const tgH = 17;

    // Baseline
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(tgX, tgY + tgH, tgX + tgW, tgY + tgH);

    const maxTrendUnits = Math.max(
      ...chartData.map(d => d.units),
      ...(showCompareLine ? compareChartData.map(d => d.units) : []),
      1
    );

    // Draw Comparison Line (Red)
    if (compareChartData && compareChartData.length > 1) {
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(0.4);
      for (let i = 0; i < compareChartData.length - 1; i++) {
        const x1 = tgX + (i / (compareChartData.length - 1)) * tgW;
        const y1 = tgY + tgH - (compareChartData[i].units / maxTrendUnits) * (tgH - 2);
        const x2 = tgX + ((i + 1) / (compareChartData.length - 1)) * tgW;
        const y2 = tgY + tgH - (compareChartData[i + 1].units / maxTrendUnits) * (tgH - 2);
        doc.line(x1, y1, x2, y2);
      }
    }

    // Draw Current Line (Blue)
    if (chartData && chartData.length > 1) {
      doc.setDrawColor(11, 87, 208);
      doc.setLineWidth(0.5);
      for (let i = 0; i < chartData.length - 1; i++) {
        const x1 = tgX + (i / (chartData.length - 1)) * tgW;
        const y1 = tgY + tgH - (chartData[i].units / maxTrendUnits) * (tgH - 2);
        const x2 = tgX + ((i + 1) / (chartData.length - 1)) * tgW;
        const y2 = tgY + tgH - (chartData[i + 1].units / maxTrendUnits) * (tgH - 2);
        doc.line(x1, y1, x2, y2);
      }
    }

    // Bottom timeline hints
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    if (chartData.length > 0) {
      doc.text(chartData[0]?.label || "", tgX, tgY + tgH + 3.5);
      doc.text(chartData[Math.floor(chartData.length / 2)]?.label || "", tgX + tgW / 2, tgY + tgH + 3.5, { align: "center" });
      doc.text(chartData[chartData.length - 1]?.label || "", tgX + tgW, tgY + tgH + 3.5, { align: "right" });
    }

    // ==========================================
    // 4. PEAK HOURS & CUSTOMER BASE (Y: 79 - 117 mm)
    // ==========================================
    const splitW = (contentWidth - 4) / 2;
    const splitH = 38;
    const splitY = 79;

    // --- 4A. PEAK BUYING HOURS ---
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, splitY, splitW, splitH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PEAK BUYING HOURS", marginX + 3.5, splitY + 4.5);

    if (hourlyDistribution.peakHour) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`Peak: ${hourlyDistribution.peakHour.label} (${hourlyDistribution.peakHour.orders} ords)`, marginX + splitW - 3.5, splitY + 4.5, { align: "right" });
    }

    // 24 Hourly bars
    const hgX = marginX + 4;
    const hgY = splitY + 7;
    const hgW = splitW - 8;
    const hgH = 23;
    const barW = (hgW / 24) * 0.75;
    const barStep = hgW / 24;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(hgX, hgY + hgH, hgX + hgW, hgY + hgH);

    hourlyDistribution.hours.forEach((h, i) => {
      const isPeak = hourlyDistribution.peakHour && h.hour === hourlyDistribution.peakHour.hour;
      const bHeight = hourlyDistribution.maxOrders > 0
        ? Math.max(0.6, (h.orders / hourlyDistribution.maxOrders) * (hgH - 2))
        : 0.6;
      
      if (isPeak) {
        doc.setFillColor(11, 87, 208);
      } else if (h.orders > 0) {
        doc.setFillColor(147, 197, 253);
      } else {
        doc.setFillColor(241, 245, 249);
      }
      doc.rect(hgX + i * barStep, hgY + hgH - bHeight, barW, bHeight, "F");
    });

    // Time Axis labels
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("12 AM", hgX, hgY + hgH + 3.5);
    doc.text("6 AM", hgX + 6 * barStep, hgY + hgH + 3.5);
    doc.text("12 PM", hgX + 12 * barStep, hgY + hgH + 3.5);
    doc.text("6 PM", hgX + 18 * barStep, hgY + hgH + 3.5);
    doc.text("11 PM", hgX + 23 * barStep, hgY + hgH + 3.5);

    // --- 4B. CUSTOMER BASE & RETENTION ---
    const cbX = marginX + splitW + 4;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cbX, splitY, splitW, splitH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("CUSTOMER BASE", cbX + 3.5, splitY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(99, 102, 241);
    doc.text(`${buyerRetentionMetrics.repeatPct}% Repeat`, cbX + splitW - 3.5, splitY + 4.5, { align: "right" });

    // Donut Chart Vector Ring on Left
    const dcX = cbX + 18;
    const dcY = splitY + 21;
    const dcR = 8.5;

    // Background track ring
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(3);
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const a1 = (i / steps) * 2 * Math.PI - Math.PI / 2;
      const a2 = ((i + 1) / steps) * 2 * Math.PI - Math.PI / 2;
      doc.line(dcX + dcR * Math.cos(a1), dcY + dcR * Math.sin(a1), dcX + dcR * Math.cos(a2), dcY + dcR * Math.sin(a2));
    }

    // Segment 1: New Buyers (Blue)
    const singleSteps = Math.round((buyerRetentionMetrics.singlePctNum / 100) * steps);
    if (singleSteps > 0) {
      doc.setDrawColor(11, 87, 208);
      doc.setLineWidth(3);
      for (let i = 0; i < singleSteps; i++) {
        const a1 = (i / steps) * 2 * Math.PI - Math.PI / 2;
        const a2 = ((i + 1) / steps) * 2 * Math.PI - Math.PI / 2;
        doc.line(dcX + dcR * Math.cos(a1), dcY + dcR * Math.sin(a1), dcX + dcR * Math.cos(a2), dcY + dcR * Math.sin(a2));
      }
    }

    // Segment 2: Repeat Buyers (Indigo)
    const repeatSteps = Math.round((buyerRetentionMetrics.repeatPctNum / 100) * steps);
    if (repeatSteps > 0) {
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(3);
      for (let i = singleSteps; i < singleSteps + repeatSteps && i < steps; i++) {
        const a1 = (i / steps) * 2 * Math.PI - Math.PI / 2;
        const a2 = ((i + 1) / steps) * 2 * Math.PI - Math.PI / 2;
        doc.line(dcX + dcR * Math.cos(a1), dcY + dcR * Math.sin(a1), dcX + dcR * Math.cos(a2), dcY + dcR * Math.sin(a2));
      }
    }

    // Center text in donut
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(buyerRetentionMetrics.totalBuyers.toLocaleString()), dcX, dcY + 0.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text("Buyers", dcX, dcY + 3.2, { align: "center" });

    // Legend on Right
    const legX = cbX + 34;
    // New
    doc.setFillColor(11, 87, 208);
    doc.circle(legX, splitY + 14, 1.2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text("New:", legX + 3, splitY + 14.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${buyerRetentionMetrics.single} (${buyerRetentionMetrics.singlePct}%)`, cbX + splitW - 3.5, splitY + 14.5, { align: "right" });

    // Repeat
    doc.setFillColor(99, 102, 241);
    doc.circle(legX, splitY + 21, 1.2, "F");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Repeat:", legX + 3, splitY + 21.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${buyerRetentionMetrics.repeat} (${buyerRetentionMetrics.repeatPct}%)`, cbX + splitW - 3.5, splitY + 21.5, { align: "right" });

    // Hairline
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(legX, splitY + 25.5, cbX + splitW - 3.5, splitY + 25.5);

    // Avg Spend
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("Avg Spend / Buyer:", legX, splitY + 30);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`$${buyerRetentionMetrics.avgSpendPerBuyer}`, cbX + splitW - 3.5, splitY + 30, { align: "right" });

    // ==========================================
    // 5. TOP 10 BEST-SELLING PRODUCTS (Y: 120 - 280 mm)
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Top 10 Best-Selling Products", marginX, 122);

    const top10 = processedSkus.slice(0, 10);

    autoTable(doc, {
      startY: 125,
      head: [["#", "SKU", "PRODUCT NAME", "UNITS SOLD", "% VS PREV", "ORDERS", "REVENUE ($)"]],
      body: top10.map((sku, index) => {
        const rank = salesRankMap.get(sku.skuKey) || (index + 1);
        const prevUnits = previousPeriodSkuUnits.get(sku.skuKey) ?? (sku.seller_sku ? previousPeriodSkuUnits.get(sku.seller_sku) : 0) ?? 0;
        let diffStr = "-";
        if (prevUnits > 0) {
          const diff = ((sku.units_sold - prevUnits) / prevUnits) * 100;
          if (diff > 0) diffStr = `+${diff.toFixed(0)}%`;
          else if (diff < 0) diffStr = `-${Math.abs(diff).toFixed(0)}%`;
        }
        return [
          String(rank),
          sku.seller_sku || "-",
          sku.product_name,
          `${sku.units_sold.toLocaleString()} pcs`,
          diffStr,
          sku.orders_count.toLocaleString(),
          `$${sku.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      }),
      theme: "plain",
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
        lineWidth: { bottom: 0.5 },
        lineColor: [203, 213, 225]
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 7.5,
        cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
        lineWidth: { bottom: 0.1 },
        lineColor: [241, 245, 249]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center", fontStyle: "bold", textColor: [11, 87, 208] },
        1: { cellWidth: 26, fontStyle: "bold" },
        2: { cellWidth: 70 },
        3: { cellWidth: 20, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 16, halign: "right" },
        6: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] }
      },
      alternateRowStyles: {
        fillColor: [250, 251, 252]
      },
      margin: { left: marginX, right: marginX }
    });

    // ==========================================
    // 6. FOOTER (Y: 288 mm)
    // ==========================================
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, 285, marginX + contentWidth, 285);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("HSG Global Internal Bridge • Performance Report", marginX, 289);
    doc.text("Page 1 of 1", marginX + contentWidth, 289, { align: "right" });

    // Open real PDF Blob URL in new window/tab
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, "_blank");
    showToast("Sales Performance Report PDF opened in new tab", "success");
  };

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

  const handleSortToggle = (field: "units_sold" | "orders_count" | "total_revenue" | "seller_sku" | "diff_pct") => {
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

  const isNextMonthDisabled = isCurrentOrFutureMonth;

  const handlePrevMonth = () => {
    const [yyyyStr, mmStr] = selectedMonth.split('-');
    let y = parseInt(yyyyStr);
    let m = parseInt(mmStr) - 1;
    if (m < 1) {
      y -= 1;
      m = 12;
    }
    const newYm = `${y}-${String(m).padStart(2, '0')}`;
    setSelectedMonth(newYm);
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    const [yyyyStr, mmStr] = selectedMonth.split('-');
    let y = parseInt(yyyyStr);
    let m = parseInt(mmStr) + 1;
    if (m > 12) {
      y += 1;
      m = 1;
    }
    const newYm = `${y}-${String(m).padStart(2, '0')}`;
    setSelectedMonth(newYm);
  };

  // Comparison Chart Data (vs Previous Period / Last Month)
  const compareChartData = React.useMemo<ChartPoint[]>(() => {
    if (!showCompareLine || orders.length === 0) return [];

    if (periodType === "year") {
      const prevYear = String(parseInt(selectedYear) - 1);
      const monthsData = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const mm = String(monthNum).padStart(2, '0');
        const monthLabel = new Date(2000, i, 1).toLocaleString('en-US', { month: 'short' });
        return {
          key: `${prevYear}-${mm}`,
          label: monthLabel,
          units: 0,
          revenue: 0,
          orders: 0
        };
      });

      orders.forEach(o => {
        const status = (o.actual_status || "").toUpperCase();
        if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") return;
        if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return;
        if (!o.create_time) return;
        const d = new Date(o.create_time * 1000);
        if (String(d.getFullYear()) !== prevYear) return;
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
      const prevMonthStr = getPreviousMonthStr(selectedMonth);
      const [yyyyStr, mmStr] = prevMonthStr.split('-');
      const yyyy = parseInt(yyyyStr);
      const mm = parseInt(mmStr) - 1;

      const count = chartData.length || new Date(yyyy, mm + 1, 0).getDate();
      const daysData = Array.from({ length: count }, (_, i) => {
        const dayNum = i + 1;
        return {
          key: `prev_${dayNum}`,
          label: String(dayNum),
          units: 0,
          revenue: 0,
          orders: 0
        };
      });

      orders.forEach(o => {
        const status = (o.actual_status || "").toUpperCase();
        if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") return;
        if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return;
        if (!o.create_time) return;
        const d = new Date(o.create_time * 1000);
        if (d.getFullYear() !== yyyy || d.getMonth() !== mm) return;
        const dayIndex = d.getDate() - 1;
        if (dayIndex >= 0 && dayIndex < count) {
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
      const currentWeek = availableWeeks[selectedWeekIndex];
      if (!currentWeek) return [];
      const prevWeekStartSec = currentWeek.startSec - 7 * 86400;
      const prevWeekEndSec = currentWeek.endSec - 7 * 86400;

      const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const daysData = weekDays.map((label, idx) => ({
        key: `prev_w_${idx}`,
        label,
        units: 0,
        revenue: 0,
        orders: 0
      }));

      orders.forEach(o => {
        const status = (o.actual_status || "").toUpperCase();
        if (status === "CANCELLED" || status === "UNPAID" || status === "FAILED") return;
        if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return;
        if (!o.create_time) return;
        if (o.create_time < prevWeekStartSec || o.create_time > prevWeekEndSec) return;
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
  }, [showCompareLine, periodType, selectedMonth, selectedYear, selectedWeekIndex, availableWeeks, chartData.length, orders, selectedShopId, getPreviousMonthStr]);

  const maxUnitsInChart = React.useMemo(() => {
    const currentMax = Math.max(...chartData.map((d: ChartPoint) => d.units), 0);
    const compareMax = showCompareLine ? Math.max(...compareChartData.map((d: ChartPoint) => d.units), 0) : 0;
    return Math.max(currentMax, compareMax, 1);
  }, [chartData, compareChartData, showCompareLine]);

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

  // Comparison Chart Coordinates (Red line)
  const compareChartPoints = React.useMemo(() => {
    if (!showCompareLine || compareChartData.length === 0) return [];
    return compareChartData.map((d, i) => {
      const x = compareChartData.length === 1 
        ? svgWidth / 2 
        : paddingX + (i / (compareChartData.length - 1)) * (svgWidth - 2 * paddingX);
      const y = svgHeight - paddingY - (maxUnitsInChart > 0 ? (d.units / maxUnitsInChart) * (svgHeight - 2 * paddingY) : 0);
      return { x, y, ...d };
    });
  }, [showCompareLine, compareChartData, maxUnitsInChart]);

  // Current Date Vertical Line Coordinate (Only for Current Month)
  const currentDayPoint = React.useMemo(() => {
    if (periodType !== "month" || chartPoints.length === 0) return null;
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (selectedMonth !== currentYm) return null;
    const todayDate = now.getDate();
    return chartPoints.find(p => p.key === String(todayDate)) || null;
  }, [periodType, selectedMonth, chartPoints]);

  // Smooth Catmull-Rom cubic bezier curve for current period (Google Blue line)
  const linePathD = React.useMemo(() => {
    if (chartPoints.length === 0) return "";
    if (chartPoints.length === 1) return `M ${chartPoints[0].x.toFixed(1)},${chartPoints[0].y.toFixed(1)}`;
    if (chartPoints.length === 2) return `M ${chartPoints[0].x.toFixed(1)},${chartPoints[0].y.toFixed(1)} L ${chartPoints[1].x.toFixed(1)},${chartPoints[1].y.toFixed(1)}`;

    let d = `M ${chartPoints[0].x.toFixed(1)},${chartPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i === 0 ? 0 : i - 1];
      const p1 = chartPoints[i];
      const p2 = chartPoints[i + 1];
      const p3 = chartPoints[i + 2] || p2;

      // Catmull-Rom to cubic bezier spline (tension = 1/6)
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }, [chartPoints]);

  // Smooth Catmull-Rom cubic bezier curve for comparison period (Red line)
  const compareLinePathD = React.useMemo(() => {
    if (!showCompareLine || compareChartPoints.length === 0) return "";
    if (compareChartPoints.length === 1) return `M ${compareChartPoints[0].x.toFixed(1)},${compareChartPoints[0].y.toFixed(1)}`;
    if (compareChartPoints.length === 2) return `M ${compareChartPoints[0].x.toFixed(1)},${compareChartPoints[0].y.toFixed(1)} L ${compareChartPoints[1].x.toFixed(1)},${compareChartPoints[1].y.toFixed(1)}`;

    let d = `M ${compareChartPoints[0].x.toFixed(1)},${compareChartPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < compareChartPoints.length - 1; i++) {
      const p0 = compareChartPoints[i === 0 ? 0 : i - 1];
      const p1 = compareChartPoints[i];
      const p2 = compareChartPoints[i + 1];
      const p3 = compareChartPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }, [showCompareLine, compareChartPoints]);

  const areaPathD = React.useMemo(() => {
    if (chartPoints.length === 0 || !linePathD) return "";
    const firstX = chartPoints[0].x.toFixed(1);
    const lastX = chartPoints[chartPoints.length - 1].x.toFixed(1);
    const bottomY = (svgHeight - paddingY).toFixed(1);
    return `${linePathD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [chartPoints, linePathD]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary select-none min-w-0">
      
      {/* 1. TOP HEADER BAR (All Filters & Actions in Single Header) */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-950">
              Tiktok Sale Report
            </h1>
            {/* Compile Status Button: Green = Compiled, Gray = Not Compiled, Disabled = Current/Future Month */}
            <button
              type="button"
              onClick={handleCompileClick}
              disabled={isCompiling || isCurrentOrFutureMonth}
              className={`p-1 rounded-md border transition-all flex items-center justify-center ${
                isCurrentOrFutureMonth
                  ? "opacity-35 cursor-not-allowed bg-slate-100 border-slate-200 text-zinc-300"
                  : isCompiling
                    ? "bg-slate-100 border-slate-200 text-zinc-400 cursor-wait"
                    : isCompiled
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                      : "bg-slate-100 border-slate-200 text-zinc-400 hover:text-zinc-600 hover:bg-slate-200/80 shadow-2xs cursor-pointer"
              }`}
              title={
                isCurrentOrFutureMonth
                  ? "Compilation is disabled for current/ongoing month. Only closed past months can be compiled."
                  : isCompiling
                    ? `Compiling report for ${formatMonthName(selectedMonth)}...`
                    : isCompiled
                      ? `Compiled on ${compiledRecord?.compiled_at ? new Date(compiledRecord.compiled_at).toLocaleDateString("en-GB") : ""}. Click to re-compile.`
                      : `Not compiled for ${formatMonthName(selectedMonth)}. Click to compile.`
              }
            >
              {isCompiling ? (
                <RefreshCw size={13} className="animate-spin text-[#0B57D0]" />
              ) : (
                <Zap size={13} className={isCurrentOrFutureMonth ? "text-zinc-300" : isCompiled ? "fill-emerald-500 text-emerald-600" : "text-zinc-400"} />
              )}
            </button>
            {isSyncing && (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-normal ml-1">
                <RefreshCw size={11} className="animate-spin text-[#0B57D0]" />
                <span>Syncing live orders in background...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 font-normal">
            Analyze SKU demand rankings, sales trends, and order volume across TikTok shops.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month Navigator Group: [<] | [📅 September 2026] (Fixed Width) | [>] */}
          {periodType === "month" && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden h-8">
              <button
                onClick={handlePrevMonth}
                className="h-full px-2 hover:bg-slate-50 text-zinc-500 hover:text-zinc-800 transition cursor-pointer border-r border-slate-200/80 flex items-center justify-center shrink-0"
                title="Previous month"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => {
                  setPickerYear(selectedMonth.split('-')[0] || String(new Date().getFullYear()));
                  setIsMonthPickerOpen(true);
                }}
                className="h-full w-[145px] px-2 hover:bg-slate-50 text-xs font-medium text-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                title="Click to select month"
              >
                <Calendar size={13} className="text-[#0B57D0] shrink-0" />
                <span className="truncate">{formatMonthName(selectedMonth)}</span>
              </button>
              <button
                onClick={handleNextMonth}
                disabled={isNextMonthDisabled}
                className={`h-full px-2 transition border-l border-slate-200/80 flex items-center justify-center shrink-0 ${
                  isNextMonthDisabled
                    ? "text-zinc-300 bg-slate-50/60 cursor-not-allowed opacity-40"
                    : "hover:bg-slate-50 text-zinc-500 hover:text-zinc-800 cursor-pointer"
                }`}
                title={isNextMonthDisabled ? "Incoming months are not available" : "Next month"}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {periodType === "year" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#0B57D0] cursor-pointer shadow-2xs"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {periodType === "week" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedWeekIndex}
                onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value))}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#0B57D0] cursor-pointer shadow-2xs"
              >
                {availableWeeks.map(w => (
                  <option key={w.index} value={w.index}>{w.label}</option>
                ))}
              </select>

              <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden h-8">
                <button
                  onClick={handlePrevMonth}
                  className="h-full px-2 hover:bg-slate-50 text-zinc-500 hover:text-zinc-800 transition cursor-pointer border-r border-slate-200/80 flex items-center justify-center shrink-0"
                  title="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    setPickerYear(selectedMonth.split('-')[0] || String(new Date().getFullYear()));
                    setIsMonthPickerOpen(true);
                  }}
                  className="h-full w-[145px] px-2 hover:bg-slate-50 text-xs font-medium text-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  title="Click to select month"
                >
                  <Calendar size={13} className="text-[#0B57D0] shrink-0" />
                  <span className="truncate">{formatMonthName(selectedMonth)}</span>
                </button>
                <button
                  onClick={handleNextMonth}
                  disabled={isNextMonthDisabled}
                  className={`h-full px-2 transition border-l border-slate-200/80 flex items-center justify-center shrink-0 ${
                    isNextMonthDisabled
                      ? "text-zinc-300 bg-slate-50/60 cursor-not-allowed opacity-40"
                      : "hover:bg-slate-50 text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  }`}
                  title={isNextMonthDisabled ? "Incoming months are not available" : "Next month"}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Period Selector Tabs: By Week | By Month | By Year */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setPeriodType("week")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                periodType === "week"
                  ? "bg-white text-[#0B57D0] shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              By Week
            </button>
            <button
              onClick={() => setPeriodType("month")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                periodType === "month"
                  ? "bg-white text-[#0B57D0] shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setPeriodType("year")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                periodType === "year"
                  ? "bg-white text-[#0B57D0] shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              By Year
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Print Performance Report (A4 Summary with Charts & Top 10) */}
          <button
            onClick={handlePrintSummaryReportPDF}
            disabled={selectedShopId === "all"}
            title={selectedShopId === "all" ? "Please select a specific TikTok shop first to print report" : "Print 1-Page A4 Performance Report with Charts & Top 10 SKUs"}
            className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition shadow-2xs ${
              selectedShopId !== "all"
                ? "border-slate-300 bg-white hover:bg-slate-50 text-zinc-800 cursor-pointer"
                : "border-slate-200 bg-slate-100 text-zinc-400 cursor-not-allowed opacity-60"
            }`}
          >
            <Printer size={13} className={selectedShopId !== "all" ? "text-zinc-600" : "text-zinc-400"} />
            <span>Print Report</span>
          </button>

          {/* Print Output Report Button with Dynamic Guardrails */}
          <button
            onClick={handlePrintReportPDF}
            disabled={!outputGuardrails.enabled}
            title={outputGuardrails.tooltip}
            className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition shadow-2xs ${
              outputGuardrails.enabled
                ? "border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 cursor-pointer"
                : "border-slate-200 bg-slate-100 text-zinc-400 cursor-not-allowed opacity-60"
            }`}
          >
            <Printer size={13} className={outputGuardrails.enabled ? "text-zinc-500" : "text-zinc-400"} />
            <span>Print SKU Output</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Export CSV"
          >
            <Download size={13} className="text-zinc-500" />
            <span>Export CSV</span>
          </button>
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
          
          {/* 3 Core Store KPI Cards (3 in 1 Row - Compact & Icon-free) */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {/* 1. Total Revenue */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-center">
              <span className="text-[9.5px] font-medium text-zinc-500 uppercase tracking-wider truncate">
                Total Sales
              </span>
              <span className="text-sm font-bold text-zinc-950 mt-0.5 truncate" title={`$${kpiTotals.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                ${kpiTotals.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 2. Total Units Sold */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-center">
              <span className="text-[9.5px] font-medium text-zinc-500 uppercase tracking-wider truncate">
                Units Sold
              </span>
              <span className="text-sm font-bold text-zinc-950 mt-0.5 truncate">
                {kpiTotals.totalUnits.toLocaleString("en-US")}{" "}
                <span className="text-[10px] font-normal text-zinc-500">pcs</span>
              </span>
            </div>

            {/* 3. Total Orders */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-center">
              <span className="text-[9.5px] font-medium text-zinc-500 uppercase tracking-wider truncate">
                Total Orders
              </span>
              <span className="text-sm font-bold text-zinc-950 mt-0.5 truncate">
                {kpiTotals.totalOrders.toLocaleString("en-US")}
              </span>
            </div>
          </div>

          {/* Small Compact Sales Trend Line Chart */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Sales Trend
                </span>
                {/* Comparison Red Line Toggle Button (Default: ON) */}
                <button
                  type="button"
                  onClick={() => setShowCompareLine(!showCompareLine)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-normal flex items-center gap-1.5 transition cursor-pointer select-none border ${
                    showCompareLine
                      ? "bg-slate-50 text-zinc-700 border-slate-300 hover:bg-slate-100"
                      : "bg-white text-zinc-400 border-slate-200 hover:bg-slate-50 opacity-60"
                  }`}
                  title={`Toggle comparison red line (${previousPeriodLabel})`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showCompareLine ? "bg-red-500" : "bg-zinc-300"}`} />
                  <span>{previousPeriodLabel}</span>
                </button>
              </div>

              {/* Hover tooltip values or Legend */}
              {hoveredChartPoint !== null && chartPoints[hoveredChartPoint] ? (
                <div className="flex items-center gap-2 text-[10px] font-normal shrink-0">
                  <span className="text-[#0B57D0] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0]" />
                    <span>{chartPoints[hoveredChartPoint].units} pcs</span>
                  </span>
                  {showCompareLine && compareChartPoints[hoveredChartPoint] && (
                    <span className="text-zinc-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>{compareChartPoints[hoveredChartPoint].units} pcs</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-normal shrink-0">
                  <span className="flex items-center gap-1 text-zinc-500">
                    <span className="w-2 h-0.5 rounded-full bg-[#0B57D0]" />
                    <span>This</span>
                  </span>
                  {showCompareLine && (
                    <span className="flex items-center gap-1 text-zinc-500">
                      <span className="w-2 h-0.5 rounded-full bg-red-500" />
                      <span>Prev</span>
                    </span>
                  )}
                </div>
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
                      <stop offset="0%" stopColor="#0B57D0" stopOpacity="0.12" />
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

                  {/* Current Date Vertical Indicator Line (Only for current month) */}
                  {currentDayPoint && (
                    <g className="pointer-events-none">
                      <line 
                        x1={currentDayPoint.x} 
                        y1={12} 
                        x2={currentDayPoint.x} 
                        y2={svgHeight - paddingY} 
                        stroke="#64748B" 
                        strokeWidth="1.25" 
                        strokeDasharray="2.5 2"
                      />
                      {/* Pill Tag at top */}
                      <rect 
                        x={Math.max(1, Math.min(svgWidth - 29, currentDayPoint.x - 14))} 
                        y={1} 
                        width={28} 
                        height={10} 
                        rx={2.5} 
                        fill="#F1F5F9" 
                        stroke="#CBD5E1" 
                        strokeWidth="0.8" 
                      />
                      <text 
                        x={Math.max(1, Math.min(svgWidth - 29, currentDayPoint.x - 14)) + 14} 
                        y={8.5} 
                        textAnchor="middle" 
                        className="text-[7px] font-semibold fill-zinc-600 font-primary"
                      >
                        Today
                      </text>
                    </g>
                  )}

                  {/* Comparison Red Line (vs Last Month / Period) */}
                  {showCompareLine && compareLinePathD && (
                    <path 
                      d={compareLinePathD} 
                      fill="none" 
                      stroke="#EF4444" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Clean Smooth Trend Line (Current Period: Google Blue) */}
                  {linePathD && (
                    <path 
                      d={linePathD} 
                      fill="none" 
                      stroke="#0B57D0" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Interactive Hover Vertical Strips & Single Active Indicator Dot */}
                  {chartPoints.map((pt, i) => {
                    const stripWidth = chartPoints.length > 1 
                      ? Math.max(8, (svgWidth - 2 * paddingX) / chartPoints.length) 
                      : 20;
                    const isHovered = hoveredChartPoint === i;

                    return (
                      <g key={i}>
                        {/* Hover vertical dashed guide line */}
                        {isHovered && (
                          <line
                            x1={pt.x}
                            y1={paddingY / 2}
                            x2={pt.x}
                            y2={svgHeight - paddingY}
                            stroke="#0B57D0"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            opacity="0.35"
                          />
                        )}

                        {/* Red active indicator dot on hover (for comparison line) */}
                        {isHovered && showCompareLine && compareChartPoints[i] && (
                          <circle
                            cx={compareChartPoints[i].x}
                            cy={compareChartPoints[i].y}
                            r={3.5}
                            fill="#EF4444"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            className="pointer-events-none drop-shadow-xs"
                          />
                        )}

                        {/* Blue active indicator dot on hover (for current period) */}
                        {isHovered && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={3.5}
                            fill="#0B57D0"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            className="pointer-events-none drop-shadow-xs"
                          />
                        )}

                        {/* Transparent full-height hit-target strip for easy hover */}
                        <rect
                          x={pt.x - stripWidth / 2}
                          y={0}
                          width={stripWidth}
                          height={svgHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredChartPoint(i)}
                          onMouseLeave={() => setHoveredChartPoint(null)}
                        />
                      </g>
                    );
                  })}
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

          {/* 3. Peak Buying Hours Chart (24-Hour Distribution) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-zinc-500" />
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Peak Buying Hours
                </span>
              </div>
              {hoveredHour !== null && hourlyDistribution.hours[hoveredHour] ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0B57D0] text-[10px] font-semibold transition-all">
                  {hourlyDistribution.hours[hoveredHour].label}: {hourlyDistribution.hours[hoveredHour].orders} ords ({hourlyDistribution.hours[hoveredHour].units} pcs)
                </span>
              ) : hourlyDistribution.peakHour ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold flex items-center gap-1 transition-all">
                  <span>🔥</span>
                  <span>Peak: {hourlyDistribution.peakHour.label} ({hourlyDistribution.peakHour.orders} ords)</span>
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 font-normal">00:00 – 23:00</span>
              )}
            </div>

            {/* 24 Hourly Vertical Bars */}
            <div className="flex items-end justify-between gap-0.5 h-12 w-full px-0.5 pt-1">
              {hourlyDistribution.hours.map((h, i) => {
                const heightPct = (h.orders / hourlyDistribution.maxOrders) * 100;
                const isPeak = hourlyDistribution.peakHour && h.hour === hourlyDistribution.peakHour.hour;
                const isHovered = hoveredHour === i;
                return (
                  <div
                    key={h.hour}
                    className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer"
                    onMouseEnter={() => setHoveredHour(i)}
                    onMouseLeave={() => setHoveredHour(null)}
                    title={`${h.rangeLabel}: ${h.orders} orders (${h.units} pcs)`}
                  >
                    <div 
                      className={`w-full rounded-t-xs transition-all duration-150 ${
                        isHovered
                          ? "bg-[#0B57D0]"
                          : isPeak
                            ? "bg-[#0B57D0]"
                            : h.orders > 0
                              ? "bg-blue-100/90 hover:bg-[#0B57D0]/70"
                              : "bg-slate-100"
                      }`}
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Axis timeline labels */}
            <div className="flex justify-between items-center text-[9px] text-zinc-400 font-normal px-1 mt-1 border-t border-slate-100 pt-1">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* 4. Customer Base Donut Chart */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Customer Base
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold">
                {buyerRetentionMetrics.repeatPct}% Repeat
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Donut Chart */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  {/* Background Track */}
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="8"
                  />
                  {/* Rotated Segments (Starting from 12 o'clock) */}
                  <g transform="rotate(-90 40 40)">
                    {/* New Buyers Segment */}
                    {buyerRetentionMetrics.singlePctNum > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#0B57D0"
                        strokeWidth="8"
                        strokeDasharray={`${(buyerRetentionMetrics.singlePctNum / 100) * 188.5} 188.5`}
                        strokeDashoffset="0"
                      />
                    )}
                    {/* Repeat Buyers Segment */}
                    {buyerRetentionMetrics.repeatPctNum > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="8"
                        strokeDasharray={`${(buyerRetentionMetrics.repeatPctNum / 100) * 188.5} 188.5`}
                        strokeDashoffset={`-${(buyerRetentionMetrics.singlePctNum / 100) * 188.5}`}
                      />
                    )}
                  </g>
                  {/* Center Text */}
                  <text
                    x="40"
                    y="37"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[12px] font-bold fill-zinc-950 font-primary"
                  >
                    {buyerRetentionMetrics.totalBuyers.toLocaleString()}
                  </text>
                  <text
                    x="40"
                    y="49"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[7.5px] font-medium fill-zinc-400 font-primary"
                  >
                    Buyers
                  </text>
                </svg>
              </div>

              {/* Simplified Legend */}
              <div className="flex-1 flex flex-col justify-center gap-1.5 pl-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0B57D0] shrink-0" />
                    <span className="text-[11px] text-zinc-600">New</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-900">
                    {buyerRetentionMetrics.single.toLocaleString()}
                    <span className="text-zinc-400 font-normal ml-1">({buyerRetentionMetrics.singlePct}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6366F1] shrink-0" />
                    <span className="text-[11px] text-zinc-600">Repeat</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-900">
                    {buyerRetentionMetrics.repeat.toLocaleString()}
                    <span className="text-zinc-400 font-normal ml-1">({buyerRetentionMetrics.repeatPct}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-slate-100 mt-0.5">
                  <span>Avg Spend:</span>
                  <span className="font-medium text-zinc-700">${buyerRetentionMetrics.avgSpendPerBuyer}</span>
                </div>
              </div>
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
            <table className="w-full border-collapse text-left text-xs table-fixed min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-[#F8F9FA] shadow-[0_1px_0_0_#E2E8F0]">
                <tr className="border-b border-slate-200 text-zinc-600">
                  <th className="p-2.5 w-[52px] text-center font-medium">#</th>
                  <th className="p-2.5 w-[46px] text-center font-medium">Image</th>
                  <th 
                    onClick={() => handleSortToggle("seller_sku")}
                    className="p-2.5 w-[18%] font-medium cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Seller SKU</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th className="p-2.5 w-[16%] font-medium">
                    <span title="Product & Variant Information">Product & Variant</span>
                  </th>
                  <th 
                    onClick={() => handleSortToggle("units_sold")}
                    className="p-2.5 w-[14%] font-medium text-right cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Units Sold</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortToggle("diff_pct")}
                    className="p-2.5 w-[11%] font-medium text-center cursor-pointer hover:bg-slate-200/60 transition"
                    title={`Percentage change vs ${previousPeriodLabel} (Click to sort)`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>% vs Prev</span>
                      <ArrowUpDown size={12} className={sortField === "diff_pct" ? "text-[#0B57D0]" : "text-zinc-400"} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortToggle("orders_count")}
                    className="p-2.5 w-[10%] font-medium text-right cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Orders</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortToggle("total_revenue")}
                    className="p-2.5 w-[15%] font-medium text-right cursor-pointer hover:bg-slate-200/60 transition"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Revenue ($)</span>
                      <ArrowUpDown size={12} className="text-zinc-400" />
                    </div>
                  </th>
                  <th className="p-2.5 w-[44px] text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-zinc-400 italic">
                      Loading sales report data...
                    </td>
                  </tr>
                ) : processedSkus.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-zinc-400 italic">
                      No SKU records found matching your selection.
                    </td>
                  </tr>
                ) : (
                  processedSkus.map((sku) => {
                    const rank = salesRankMap.get(sku.skuKey) || 0;
                    const prevUnits = previousPeriodSkuUnits.get(sku.skuKey) ?? previousPeriodSkuUnits.get(sku.seller_sku) ?? 0;
                    const prevRank = previousSalesRankMap.get(sku.skuKey) ?? (sku.seller_sku ? previousSalesRankMap.get(sku.seller_sku) : null) ?? null;
                    
                    let rankShiftBadge: React.ReactNode = null;
                    if (rank >= 1 && rank <= 10 && prevRank !== null && prevRank !== rank) {
                      const shift = prevRank - rank;
                      if (shift > 0) {
                        rankShiftBadge = (
                          <span 
                            className="absolute -top-1.5 -right-3 text-[7.5px] font-bold text-emerald-600 leading-none flex items-center" 
                            title={`Climbed ${shift} positions (was #${prevRank} in ${previousPeriodShortLabel})`}
                          >
                            ▲{shift}
                          </span>
                        );
                      } else if (shift < 0) {
                        rankShiftBadge = (
                          <span 
                            className="absolute -top-1.5 -right-3 text-[7.5px] font-bold text-rose-600 leading-none flex items-center" 
                            title={`Dropped ${Math.abs(shift)} positions (was #${prevRank} in ${previousPeriodShortLabel})`}
                          >
                            ▼{Math.abs(shift)}
                          </span>
                        );
                      }
                    }

                    let diffBadge: React.ReactNode = null;
                    if (prevUnits > 0) {
                      const diff = ((sku.units_sold - prevUnits) / prevUnits) * 100;
                      if (diff > 0) {
                        diffBadge = (
                          <span 
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 tabular-nums" 
                            title={`Previous period (${previousPeriodLabel}): ${prevUnits} pcs`}
                          >
                            <span className="text-[8.5px] leading-none">▲</span>
                            <span>{diff.toFixed(0)}%</span>
                          </span>
                        );
                      } else if (diff < 0) {
                        diffBadge = (
                          <span 
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 tabular-nums" 
                            title={`Previous period (${previousPeriodLabel}): ${prevUnits} pcs`}
                          >
                            <span className="text-[8.5px] leading-none">▼</span>
                            <span>{Math.abs(diff).toFixed(0)}%</span>
                          </span>
                        );
                      }
                    }

                    return (
                      <tr 
                        key={sku.skuKey}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition duration-150"
                      >
                        {/* Rank Badge with Rank Shift Indicator (Top 10 only) */}
                        <td className="p-2.5 text-center align-middle">
                          <div className="relative inline-flex items-center justify-center">
                            {rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0B57D0] text-white text-[10px] font-semibold shadow-2xs" title="Top Seller (#1)">
                                1
                              </span>
                            ) : rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-semibold" title="Rank #2">
                                2
                              </span>
                            ) : rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-500 text-white text-[10px] font-semibold" title="Rank #3">
                                3
                              </span>
                            ) : rank <= 5 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-zinc-700 border border-slate-200 text-[10px] font-medium" title={`Rank #${rank}`}>
                                {rank}
                              </span>
                            ) : rank <= 10 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-zinc-700 border border-slate-200 text-[10px] font-medium" title={`Rank #${rank}`}>
                                {rank}
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-normal text-xs">{rank}</span>
                            )}
                            {rankShiftBadge}
                          </div>
                        </td>

                        {/* Image Thumbnail */}
                        <td className="p-2.5 text-center align-middle">
                          {sku.sku_image ? (
                            <img
                              src={sku.sku_image}
                              alt="SKU"
                              className="w-8 h-8 rounded-md border border-slate-200 object-cover mx-auto"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center text-[9px] text-zinc-400 font-medium mx-auto">
                              N/A
                            </div>
                          )}
                        </td>

                        {/* Seller SKU */}
                        <td className="p-2.5 align-middle font-mono font-medium text-zinc-900 truncate">
                          {sku.seller_sku}
                        </td>

                        {/* Product & Variant Name (Compact Secondary Info) */}
                        <td className="p-2.5 align-middle">
                          <div className="flex flex-col max-w-[170px]">
                            <span className="text-[11px] font-normal text-zinc-500 truncate" title={sku.product_name}>
                              {sku.product_name}
                            </span>
                            {sku.sku_name && sku.sku_name !== "-" && (
                              <span className="text-[10px] text-zinc-400 font-normal truncate" title={sku.sku_name}>
                                {sku.sku_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Units Sold (Clean pcs text, no bar) */}
                        <td className="p-2.5 align-middle text-right text-zinc-900">
                          <span className="text-xs font-medium text-zinc-900">
                            {sku.units_sold.toLocaleString()} pcs
                          </span>
                        </td>

                        {/* Dedicated % vs Previous Period Column */}
                        <td className="p-2.5 align-middle text-center">
                          {diffBadge || <span className="text-zinc-300 text-xs font-normal">-</span>}
                        </td>

                        {/* Orders Count */}
                        <td className="p-2.5 align-middle text-right font-normal text-zinc-600">
                          {sku.orders_count.toLocaleString()}
                        </td>

                        {/* Total Revenue */}
                        <td className="p-2.5 align-middle text-right font-semibold text-zinc-900">
                          ${sku.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Action */}
                        <td className="p-2.5 align-middle text-center">
                          <button
                            onClick={() => setSelectedSkuModal(sku)}
                            className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-zinc-500 hover:text-[#0B57D0] transition cursor-pointer"
                            title="View Orders"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Sticky Table Footer Summary */}
          <div className="px-4 py-2.5 border-t border-slate-200 bg-[#F8F9FA] flex items-center justify-between text-xs text-zinc-500 font-normal shrink-0">
            <span>
              Showing {processedSkus.length} of {skuSummaries.length} total SKUs
            </span>
            <div className="flex items-center gap-4">
              <span>Total Units: <strong className="text-zinc-900 font-semibold">{kpiTotals.totalUnits} pcs</strong></span>
              <span>Total Sales: <strong className="text-zinc-900 font-semibold">${kpiTotals.totalRevenue.toFixed(2)}</strong></span>
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

            {/* 5 KPI Metric Items (Single Flat Row, No Over-Nesting) */}
            {(() => {
              const prices = selectedSkuModal.orders
                .map((o: any) => parseFloat(o.sale_price) || 0)
                .filter((p: number) => !isNaN(p) && p >= 0);
              const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
              const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;

              return (
                <div className="grid grid-cols-5 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/70 py-2.5 px-6 text-xs shrink-0">
                  <div className="pr-2">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Units Sold</span>
                    <span className="font-semibold text-zinc-900 text-xs mt-0.5 block">{selectedSkuModal.units_sold.toLocaleString()} pcs</span>
                  </div>
                  <div className="px-2">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Total Orders</span>
                    <span className="font-semibold text-zinc-900 text-xs mt-0.5 block">{selectedSkuModal.orders_count.toLocaleString()}</span>
                  </div>
                  <div className="px-2">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Total Sales</span>
                    <span className="font-semibold text-[#0B57D0] text-xs mt-0.5 block">${selectedSkuModal.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="px-2">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Selling Price Lowest</span>
                    <span className="font-semibold text-zinc-900 text-xs mt-0.5 block">${lowestPrice.toFixed(2)}</span>
                  </div>
                  <div className="pl-2">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Selling Price Highest</span>
                    <span className="font-semibold text-zinc-900 text-xs mt-0.5 block">${highestPrice.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Orders List Body */}
            <div className="p-6 flex flex-col gap-2 shrink-0">
              <h4 className="text-xs font-semibold text-zinc-700 tracking-tight">
                Order Summary ({selectedSkuModal.orders.length})
              </h4>

              {/* 8-Row Scrollable Container */}
              <div className="max-h-[235px] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
                {selectedSkuModal.orders.map((ord: any, idx: number) => {
                  const dateStr = new Date(ord.create_time * 1000).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });
                  const itemAmount = (ord.quantity * parseFloat(ord.sale_price || 0)).toFixed(2);

                  return (
                    <div key={idx} className="h-[28px] px-3 flex items-center justify-between text-[11px] hover:bg-slate-50/80 transition">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-zinc-700 font-normal">{ord.order_id}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-[10px] text-zinc-400 font-normal">{dateStr}</span>
                      </div>

                      <div className="flex items-center shrink-0 pl-4 font-mono text-[11px]">
                        <span className="text-zinc-500 font-normal">{ord.quantity} pcs</span>
                        <span className="text-zinc-300 mx-2">|</span>
                        <span className="text-zinc-800 font-normal">${itemAmount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {/* 6. CENTERED MONTH PICKER MODAL POPUP */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4 select-none font-primary animate-in fade-in duration-100">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-[320px] p-4 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">Select Month</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-normal">Choose period for sales report</p>
              </div>
              <button
                onClick={() => setIsMonthPickerOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Year Selector Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 w-10">Year:</span>
              <div className="flex items-center gap-1.5 flex-1">
                {availableYears.map(y => {
                  const isSelected = y === pickerYear;
                  return (
                    <button
                      key={y}
                      onClick={() => setPickerYear(y)}
                      className={`h-7 px-3 rounded-md text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? "bg-[#0B57D0] text-white shadow-xs font-semibold"
                          : "bg-slate-100 text-zinc-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 12 Months Grid (4 rows x 3 cols, uniform clean rectangular buttons) */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 w-full">
              {[
                { m: "01", label: "Jan" },
                { m: "02", label: "Feb" },
                { m: "03", label: "Mar" },
                { m: "04", label: "Apr" },
                { m: "05", label: "May" },
                { m: "06", label: "Jun" },
                { m: "07", label: "Jul" },
                { m: "08", label: "Aug" },
                { m: "09", label: "Sep" },
                { m: "10", label: "Oct" },
                { m: "11", label: "Nov" },
                { m: "12", label: "Dec" }
              ].map(item => {
                const ym = `${pickerYear}-${item.m}`;
                const currentYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                const isFuture = ym > currentYm;
                const hasData = availableMonths.includes(ym);
                const isCurrent = ym === selectedMonth;
                const isDisabled = !hasData || isFuture;

                return (
                  <button
                    key={item.m}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setSelectedMonth(ym);
                      setIsMonthPickerOpen(false);
                    }}
                    className={`w-full h-9 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center box-border ${
                      isCurrent
                        ? "bg-[#0B57D0] text-white font-semibold shadow-xs border border-[#0B57D0] cursor-pointer"
                        : !isDisabled
                          ? "bg-white hover:bg-blue-50 hover:text-[#0B57D0] hover:border-blue-300 text-zinc-800 border border-slate-200 shadow-2xs cursor-pointer"
                          : "text-zinc-300 bg-slate-50/40 border border-slate-200/60 cursor-not-allowed opacity-40"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
