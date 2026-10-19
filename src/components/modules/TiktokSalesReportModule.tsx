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
  const [sortField, setSortField] = React.useState<"units_sold" | "orders_count" | "total_revenue" | "seller_sku">("units_sold");
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

    const repeatPct = totalBuyers > 0 ? ((repeat / totalBuyers) * 100).toFixed(1) : "0.0";
    const singlePct = totalBuyers > 0 ? ((single / totalBuyers) * 100).toFixed(1) : "100.0";
    const totalOrders = kpiTotals.totalOrders || sourceOrders.length;
    const avgOrdersPerBuyer = totalBuyers > 0 ? (totalOrders / totalBuyers).toFixed(2) : "1.00";
    const avgSpendPerBuyer = totalBuyers > 0 ? (kpiTotals.totalRevenue / totalBuyers).toFixed(2) : "0.00";

    return {
      totalBuyers,
      single,
      repeat,
      repeatPct,
      singlePct,
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

  // Dynamic Previous Period SKU Units Map for "% vs previous period" (Month, Week, Year)
  const previousPeriodSkuUnits = React.useMemo(() => {
    if (orders.length === 0) return new Map<string, number>();
    const map = new Map<string, number>();

    const recordItemUnits = (o: any) => {
      (o.items || []).forEach((item: any) => {
        const skuKey = (item.seller_sku || `${item.product_name}_${item.sku_name}`).trim();
        const qty = Number(item.quantity) || 1;
        map.set(skuKey, (map.get(skuKey) || 0) + qty);
        if (item.seller_sku) {
          map.set(item.seller_sku.trim(), (map.get(item.seller_sku.trim()) || 0) + qty);
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
      return map;
    }

    if (periodType === "month") {
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
      return map;
    }

    if (periodType === "week") {
      const currentWeek = availableWeeks[selectedWeekIndex];
      if (!currentWeek) return map;
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
      return map;
    }

    return map;
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

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("HSG Global — Monthly SKU Output Report", 14, 18);

    // Metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("TikTok Shop:", 14, 26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 87, 208); // #0B57D0
    doc.text(shopName, 40, 26);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Period:", 14, 32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 87, 208);
    doc.text(periodName, 40, 32);

    // Header divider line
    doc.setDrawColor(11, 87, 208);
    doc.setLineWidth(0.8);
    doc.line(14, 36, 196, 36);

    // Table
    autoTable(doc, {
      startY: 40,
      head: [["SKU", "PRODUCT NAME", "QTY"]],
      body: aggregatedRows.map(row => [row.sku, row.name, row.qty.toLocaleString()]),
      theme: "plain",
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        lineWidth: { bottom: 0.5 },
        lineColor: [203, 213, 225]
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
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
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 50;

    // Summary line
    const totalUnits = aggregatedRows.reduce((acc, r) => acc + r.qty, 0);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, finalY + 4, 196, finalY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Unique SKUs: ${aggregatedRows.length}`, 14, finalY + 10);
    doc.text(`Total Output Units: ${totalUnits.toLocaleString()} pcs`, 196, finalY + 10, { align: "right" });

    // Open real PDF Blob URL in new window/tab
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, "_blank");
    showToast("SKU Output Report PDF opened in new tab", "success");
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
            <span>Print Output Report</span>
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
          
          {/* 4 Core Store KPI Cards (2x2 Compact Grid) */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            
            {/* 1. Total Revenue */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Total Sales</span>
                <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0B57D0] flex items-center justify-center">
                  <DollarSign size={13} />
                </div>
              </div>
              <span className="text-base font-semibold text-zinc-950 mt-1">
                ${kpiTotals.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 2. Total Units Sold */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Units Sold</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package size={13} />
                </div>
              </div>
              <span className="text-base font-semibold text-zinc-950 mt-1">
                {kpiTotals.totalUnits.toLocaleString("en-US")} <span className="text-xs font-normal text-zinc-500">pcs</span>
              </span>
            </div>

            {/* 3. Total Orders */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Total Orders</span>
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShoppingCart size={13} />
                </div>
              </div>
              <span className="text-base font-semibold text-zinc-950 mt-1">
                {kpiTotals.totalOrders.toLocaleString("en-US")}
              </span>
            </div>

            {/* 4. Buyer Spend Avg / Basket */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[75px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Spend / Basket</span>
                <div className="w-6 h-6 rounded-md bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <DollarSign size={13} />
                </div>
              </div>
              <div className="flex flex-col mt-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-semibold text-zinc-950">
                    ${(kpiTotals.avgSpendPerOrder || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">/ord</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-zinc-500 mt-0.5 truncate" title={`Order: $${(kpiTotals.avgSpendPerOrder || 0).toFixed(2)} | Qty/Ord: ${(kpiTotals.avgUnitsPerOrder || 0).toFixed(1)} pcs | Spend/Buyer: $${(kpiTotals.avgSpendPerBuyer || 0).toFixed(2)}`}>
                  <span>${(kpiTotals.avgSpendPerBuyer || 0).toFixed(2)}/buyer</span>
                  <span>•</span>
                  <span>{(kpiTotals.avgUnitsPerOrder || 0).toFixed(1)} pcs/ord</span>
                </div>
              </div>
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
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-zinc-500" />
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Peak Buying Hours
                </span>
              </div>
              {hourlyDistribution.peakHour ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold flex items-center gap-1">
                  <span>🔥</span>
                  <span>Peak: {hourlyDistribution.peakHour.label} ({hourlyDistribution.peakHour.orders} ords)</span>
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 font-normal">00:00 – 23:00</span>
              )}
            </div>

            {/* Hover tooltip hint */}
            {hoveredHour !== null && hourlyDistribution.hours[hoveredHour] ? (
              <div className="text-[10px] text-zinc-600 flex items-center justify-between px-2 py-0.5 mb-1.5 bg-slate-50 rounded border border-slate-100">
                <span className="font-medium">{hourlyDistribution.hours[hoveredHour].rangeLabel}</span>
                <span className="text-[#0B57D0] font-semibold">
                  {hourlyDistribution.hours[hoveredHour].orders} orders ({hourlyDistribution.hours[hoveredHour].units} pcs)
                </span>
              </div>
            ) : null}

            {/* 24 Hourly Vertical Bars */}
            <div className="flex items-end justify-between gap-0.5 h-14 w-full px-0.5 pt-1">
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

          {/* 4. Customer Base & Retention Card (Combined with Unique Buyers) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Customer Base & Retention
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold">
                {buyerRetentionMetrics.repeatPct}% Repeat Rate
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-semibold text-zinc-950">
                  {buyerRetentionMetrics.totalBuyers.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500 font-normal">Unique Buyers</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-normal">
                {buyerRetentionMetrics.avgOrdersPerBuyer} ord/buyer
              </span>
            </div>

            {/* Stacked Ratio Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex my-2">
              <div 
                className="bg-[#0B57D0] h-full transition-all duration-300"
                style={{ width: `${buyerRetentionMetrics.singlePct}%` }}
                title={`New / 1 Order: ${buyerRetentionMetrics.single} (${buyerRetentionMetrics.singlePct}%)`}
              />
              <div 
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${buyerRetentionMetrics.repeatPct}%` }}
                title={`Returning (2+): ${buyerRetentionMetrics.repeat} (${buyerRetentionMetrics.repeatPct}%)`}
              />
            </div>

            {/* Breakdown Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-zinc-600">
                <span className="w-2 h-2 rounded-full bg-[#0B57D0] shrink-0" />
                <span className="text-[11px] font-normal truncate">
                  New: <strong className="text-zinc-900 font-medium">{buyerRetentionMetrics.single}</strong> ({buyerRetentionMetrics.singlePct}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-[11px] font-normal truncate">
                  Repeat: <strong className="text-zinc-900 font-medium">{buyerRetentionMetrics.repeat}</strong> ({buyerRetentionMetrics.repeatPct}%)
                </span>
              </div>
            </div>

            {/* Average Spend Subtext */}
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 pt-1 border-t border-slate-50 font-normal">
              <span>Avg Spend / Buyer:</span>
              <span className="text-zinc-700 font-medium">${buyerRetentionMetrics.avgSpendPerBuyer}</span>
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
                  <th className="p-2.5 w-[44px] text-center font-medium">#</th>
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
                    className="p-2.5 w-[11%] font-medium text-center"
                    title={`Percentage change vs ${previousPeriodLabel}`}
                  >
                    <span>% vs Prev</span>
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
                    let diffBadge: React.ReactNode = null;
                    if (prevUnits > 0) {
                      const diff = ((sku.units_sold - prevUnits) / prevUnits) * 100;
                      if (diff >= 0) {
                        diffBadge = (
                          <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50/70 px-1.5 py-0.5 rounded border border-emerald-100" title={`Previous period (${previousPeriodLabel}): ${prevUnits} pcs`}>
                            +{diff.toFixed(0)}%
                          </span>
                        );
                      } else {
                        diffBadge = (
                          <span className="text-[10px] font-normal text-rose-600 bg-rose-50/70 px-1.5 py-0.5 rounded border border-rose-100" title={`Previous period (${previousPeriodLabel}): ${prevUnits} pcs`}>
                            {diff.toFixed(0)}%
                          </span>
                        );
                      }
                    } else if (sku.units_sold > 0) {
                      diffBadge = (
                        <span className="text-[9.5px] font-normal text-emerald-600 bg-emerald-50/70 px-1.5 py-0.5 rounded border border-emerald-100" title={`New product this ${periodType}`}>
                          New
                        </span>
                      );
                    }

                    return (
                      <tr 
                        key={sku.skuKey}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition duration-150"
                      >
                        {/* Rank Badge */}
                        <td className="p-2.5 text-center align-middle">
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
                          ) : (
                            <span className="text-zinc-400 font-normal text-xs">{rank}</span>
                          )}
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
                          {diffBadge || <span className="text-zinc-300 text-xs font-normal">—</span>}
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
