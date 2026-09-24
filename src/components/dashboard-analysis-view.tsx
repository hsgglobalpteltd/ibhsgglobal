"use client";

import * as React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PieChart,
  Layers,
  Tag,
  GripVertical,
  X,
  Plus,
  RotateCcw,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export type ChartCardId = "channel_pie" | "buyer_pie" | "trend_12m";

export interface ChartLayoutItem {
  id: ChartCardId;
  title: string;
  visible: boolean;
  width: number;
  height: number;
  order: number;
}

const DEFAULT_LAYOUT: ChartLayoutItem[] = [
  { id: "channel_pie", title: "Sell In by Channel", visible: true, width: 300, height: 420, order: 0 },
  { id: "buyer_pie", title: "Sell In by Buyers", visible: true, width: 300, height: 420, order: 1 },
  { id: "trend_12m", title: "12-Month Performance Trend", visible: true, width: 550, height: 420, order: 2 },
];

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface ChannelData {
  channel: string;
  grossAmount: number;
  returnsAmount: number;
  netAmount: number;
  percentage: number;
  color: string;
  qty: number;
}

interface BuyerData {
  buyer: string;
  grossAmount: number;
  returnsAmount: number;
  netAmount: number;
  percentage: number;
  color: string;
  qty: number;
}

// Google Material / Workspace cohesive palette
const CHANNEL_PALETTE: Record<string, string> = {
  "Retailer": "#0B57D0",          // Google Deep Blue
  "Small Retailer": "#00838F",    // Cyan/Teal
  "Convenience Store": "#F29900", // Amber/Orange
  "Online": "#7C3AED",            // Purple/Indigo
  "Supermarket": "#1E8E3E",       // Green
  "Wholesale": "#D93025",         // Red/Crimson
  "Direct": "#E37400",            // Orange
  "Direct Sales": "#00838F",      // Cyan/Teal
  "Mosque": "#8B5CF6",            // Purple/Violet
  "Default": "#5F6368",           // Slate/Gray
};

const COLOR_LIST = [
  "#0B57D0",
  "#00838F",
  "#F29900",
  "#7C3AED",
  "#1E8E3E",
  "#D93025",
  "#0284C7",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#F59E0B",
  "#64748B",
];

// Helper to generate SVG pie slices for donut charts
function generatePieSlices(
  items: { key: string; percentage: number; color: string }[],
  totalAmount: number
) {
  if (items.length === 0 || totalAmount <= 0) return [];

  let accumulatedAngle = 0;
  const radius = 70;
  const innerRadius = 45; // Donut style
  const cx = 100;
  const cy = 100;

  return items.map((item) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle += angle;

    // Convert angles from degrees to radians, offset by -90 deg so 0 is at top
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const ix1 = cx + innerRadius * Math.cos(endRad);
    const iy1 = cy + innerRadius * Math.sin(endRad);
    const ix2 = cx + innerRadius * Math.cos(startRad);
    const iy2 = cy + innerRadius * Math.sin(startRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    let d = "";
    if (angle >= 359.99) {
      d = `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 0 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 0 ${cx} ${cy - radius} M ${cx} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy + innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy - innerRadius} Z`;
    } else {
      d = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2}`,
        "Z",
      ].join(" ");
    }

    return {
      ...item,
      path: d,
      startAngle,
      endAngle,
    };
  });
}

export function DashboardAnalysisView() {
  // Global Month Filter initialized to previous month (matching sales cycle)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [loading, setLoading] = React.useState<boolean>(false);
  const [salesInData, setSalesInData] = React.useState<any[]>([]);
  const [channelsList, setChannelsList] = React.useState<any[]>([]);
  const [productsList, setProductsList] = React.useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = React.useState<string>("All Brands");
  const [hoveredChannel, setHoveredChannel] = React.useState<string | null>(null);
  const [hoveredBuyer, setHoveredBuyer] = React.useState<string | null>(null);
  const [showChannelBreakdown, setShowChannelBreakdown] = React.useState<boolean>(false);
  const [showBuyerBreakdown, setShowBuyerBreakdown] = React.useState<boolean>(false);

  // 12-Month Trend State & Cache
  const [trendToggle, setTrendToggle] = React.useState<"channel" | "buyer">("channel");
  const [twelveMonthRecords, setTwelveMonthRecords] = React.useState<Record<string, any[]>>({});
  const [loading12m, setLoading12m] = React.useState<boolean>(false);
  const [hoveredMonthIndex, setHoveredMonthIndex] = React.useState<number | null>(null);
  const [hoveredTrendCategory, setHoveredTrendCategory] = React.useState<string | null>(null);
  const cache12m = React.useRef<Map<string, any[]>>(new Map());

  // 📐 Custom Dashboard Layout State with LocalStorage Persistence
  const [layout, setLayout] = React.useState<ChartLayoutItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ib_dashboard_analysis_layout_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = DEFAULT_LAYOUT.map((def) => {
              const found = parsed.find((p: any) => p.id === def.id);
              return found
                ? {
                    ...def,
                    ...found,
                    width: typeof found.width === "number" && found.width >= 240 ? found.width : def.width,
                    height: typeof found.height === "number" && found.height >= 240 ? found.height : def.height,
                  }
                : def;
            });
            return merged.sort((a, b) => a.order - b.order);
          }
        }
      } catch {}
    }
    return DEFAULT_LAYOUT;
  });

  const updateLayout = React.useCallback((newLayout: ChartLayoutItem[]) => {
    setLayout(newLayout);
    try {
      localStorage.setItem("ib_dashboard_analysis_layout_v1", JSON.stringify(newLayout));
    } catch {}
  }, []);

  // Drag-and-drop reorder state
  const [draggedId, setDraggedId] = React.useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const sourceIndex = layout.findIndex((it) => it.id === draggedId);
    const targetIndex = layout.findIndex((it) => it.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newLayout = [...layout];
    const [removed] = newLayout.splice(sourceIndex, 1);
    newLayout.splice(targetIndex, 0, removed);
    const updated = newLayout.map((it, idx) => ({ ...it, order: idx }));
    updateLayout(updated);
    setDraggedId(null);
  };

  // Interactive Drag-to-Resize on right border (width), bottom border (height), and corner (both)
  const [resizing, setResizing] = React.useState<{
    id: string;
    direction: "horizontal" | "vertical" | "both";
  } | null>(null);
  const resizeStartPos = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartDimensions = React.useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleResizeStart = (
    id: string,
    direction: "horizontal" | "vertical" | "both",
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ id, direction });
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    const currentItem = layout.find((it) => it.id === id);
    resizeStartDimensions.current = {
      width: currentItem?.width || (id === "trend_12m" ? 550 : 300),
      height: currentItem?.height || 420,
    };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;

      setLayout((prev) =>
        prev.map((it) => {
          if (it.id !== resizing.id) return it;
          let newWidth = it.width;
          let newHeight = it.height || 420;

          if (resizing.direction === "horizontal" || resizing.direction === "both") {
            newWidth = Math.max(260, Math.min(1200, resizeStartDimensions.current.width + deltaX));
          }
          if (resizing.direction === "vertical" || resizing.direction === "both") {
            newHeight = Math.max(260, Math.min(900, resizeStartDimensions.current.height + deltaY));
          }

          return { ...it, width: newWidth, height: newHeight };
        })
      );
    };

    const handleMouseUp = () => {
      if (resizing) {
        setResizing(null);
        try {
          localStorage.setItem("ib_dashboard_analysis_layout_v1", JSON.stringify(layout));
        } catch {}
      }
    };

    if (resizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, layout]);

  // Remove / Add / Reset Cards
  const removeCard = (id: string) => {
    const updated = layout.map((it) => (it.id === id ? { ...it, visible: false } : it));
    updateLayout(updated);
    showToast("Chart hidden. You can re-add it from '+ Charts'", "info");
  };

  const addCard = (id: string) => {
    const updated = layout.map((it) => (it.id === id ? { ...it, visible: true } : it));
    updateLayout(updated);
    showToast("Chart added to dashboard", "success");
  };

  const resetLayout = () => {
    updateLayout(DEFAULT_LAYOUT);
    showToast("Dashboard layout reset to default", "success");
  };

  // Add Chart Dropdown Menu
  const [addDropdownOpen, setAddDropdownOpen] = React.useState<boolean>(false);
  const addDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addDropdownRef.current && !addDropdownRef.current.contains(event.target as Node)) {
        setAddDropdownOpen(false);
      }
    }
    if (addDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [addDropdownOpen]);

  // Generate 12 trailing months leading up to and including selectedMonth
  const twelveMonths = React.useMemo(() => {
    try {
      const [y, m] = selectedMonth.split("-").map(Number);
      const list: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(y, m - 1 - i, 1);
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        list.push(`${yr}-${mo}`);
      }
      return list;
    } catch {
      return [selectedMonth];
    }
  }, [selectedMonth]);

  // Month navigation: go to previous month
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${prevY}-${prevM}`);
  };

  // Month navigation: go to next month
  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  // Fetch sell-in batch data for the selected month
  const fetchMonthData = React.useCallback(async (period: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/batch-details?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data.records) ? data.records : (Array.isArray(data.sales_in) ? data.sales_in : []);
        setSalesInData(records);
        cache12m.current.set(period, records);
        setTwelveMonthRecords((prev) => ({ ...prev, [period]: records }));
        if (Array.isArray(data.channels) && data.channels.length > 0) {
          setChannelsList(data.channels);
        }
      } else {
        setSalesInData([]);
        cache12m.current.set(period, []);
      }
    } catch (err: any) {
      if (!silent) showToast("Failed to load sales data: " + err.message, "error");
      setSalesInData([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch 12-Month Batches in parallel
  React.useEffect(() => {
    let isMounted = true;
    const load12Months = async () => {
      const missing = twelveMonths.filter((m) => !cache12m.current.has(m));
      if (missing.length > 0) {
        setLoading12m(true);
        await Promise.all(
          missing.map(async (m) => {
            try {
              const res = await fetch(`${API_BASE}/api/sellin/batch-details?period=${m}`);
              if (res.ok) {
                const data = await res.json();
                const recs = Array.isArray(data.records) ? data.records : (Array.isArray(data.sales_in) ? data.sales_in : []);
                cache12m.current.set(m, recs);
              } else {
                cache12m.current.set(m, []);
              }
            } catch {
              cache12m.current.set(m, []);
            }
          })
        );
      }
      if (isMounted) {
        const recordsMap: Record<string, any[]> = {};
        twelveMonths.forEach((m) => {
          recordsMap[m] = cache12m.current.get(m) || [];
        });
        setTwelveMonthRecords(recordsMap);
        setLoading12m(false);
      }
    };

    load12Months();
    return () => {
      isMounted = false;
    };
  }, [twelveMonths]);

  // Fetch product metadata for brand mapping
  const fetchMetadata = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sales-projections/metadata`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          setProductsList(data.products);
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  React.useEffect(() => {
    fetchMonthData(selectedMonth);
  }, [selectedMonth, fetchMonthData]);

  // Listen to Global TopBar #global-refresh-button 'db-refresh' event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      cache12m.current.clear();
      await Promise.all([
        fetchMonthData(selectedMonth, false),
        fetchMetadata()
      ]);
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [fetchMonthData, fetchMetadata, selectedMonth]);

  // Derived available brands list from products & salesInData
  const availableBrands = React.useMemo(() => {
    const brandSet = new Set<string>();
    
    // Check productsList
    productsList.forEach((p) => {
      const b = p.brand || p.brand_name || p.brand_assigned;
      if (b && typeof b === "string" && b.trim()) {
        brandSet.add(b.trim());
      }
    });

    // Check salesInData
    salesInData.forEach((r) => {
      if (r.brand && typeof r.brand === "string" && r.brand.trim()) {
        brandSet.add(r.brand.trim());
      }
      // If product lookup has brand
      const sku = (r.sku || r.prodcode || "").toLowerCase().trim();
      if (sku) {
        const matched = productsList.find(
          (p) => (p.sku || p.id || "").toLowerCase().trim() === sku
        );
        if (matched) {
          const b = matched.brand || matched.brand_name || matched.brand_assigned;
          if (b && typeof b === "string" && b.trim()) {
            brandSet.add(b.trim());
          }
        }
      }
    });

    const list = Array.from(brandSet).sort();
    return ["All Brands", ...list];
  }, [productsList, salesInData]);

  // Filter salesInData by selected brand
  const filteredSalesIn = React.useMemo(() => {
    if (selectedBrand === "All Brands") return salesInData;

    return salesInData.filter((r) => {
      if (r.brand && r.brand.trim().toLowerCase() === selectedBrand.toLowerCase()) {
        return true;
      }
      const sku = (r.sku || r.prodcode || "").toLowerCase().trim();
      if (sku) {
        const matched = productsList.find(
          (p) => (p.sku || p.id || "").toLowerCase().trim() === sku
        );
        if (matched) {
          const b = matched.brand || matched.brand_name || matched.brand_assigned;
          if (b && typeof b === "string" && b.trim().toLowerCase() === selectedBrand.toLowerCase()) {
            return true;
          }
        }
      }
      return false;
    });
  }, [salesInData, selectedBrand, productsList]);

  // 1. Aggregate Sell-In by Sales Channel
  const { channelAggregates, totalSellInAmount, totalSellInQty } = React.useMemo(() => {
    const map = new Map<string, { grossAmount: number; returnsAmount: number; netAmount: number; qty: number }>();
    let grandTotalAmt = 0;
    let grandTotalQty = 0;

    filteredSalesIn.forEach((r) => {
      const channel = (r.channel || r.sales_channel || "Retailer").trim();
      const grossAmt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
      const returnsAmt = Number(r.cn_amount !== undefined ? r.cn_amount : (r.returns_amount || (Number(r.total_amount || 0) < 0 ? Math.abs(r.total_amount) : 0)));
      const netAmt = Number(r.nett_amount !== undefined ? r.nett_amount : (r.net_amount || r.total_amount || (grossAmt - returnsAmt)));
      const grossQty = Number(r.quantity !== undefined ? r.quantity : (r.gross_qty || (Number(r.total_qty || 0) > 0 ? r.total_qty : 0)));

      const existing = map.get(channel) || { grossAmount: 0, returnsAmount: 0, netAmount: 0, qty: 0 };
      existing.grossAmount += grossAmt;
      existing.returnsAmount += returnsAmt;
      existing.netAmount += netAmt;
      existing.qty += grossQty;
      map.set(channel, existing);

      grandTotalAmt += grossAmt;
      grandTotalQty += grossQty;
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1].grossAmount - a[1].grossAmount);

    const aggregates: ChannelData[] = entries.map(([channel, stats], idx) => {
      const percentage = grandTotalAmt > 0 ? (stats.grossAmount / grandTotalAmt) * 100 : 0;
      const color = CHANNEL_PALETTE[channel] || COLOR_LIST[idx % COLOR_LIST.length];
      return {
        channel,
        grossAmount: stats.grossAmount,
        returnsAmount: stats.returnsAmount,
        netAmount: stats.netAmount,
        percentage,
        color,
        qty: stats.qty,
      };
    });

    return {
      channelAggregates: aggregates,
      totalSellInAmount: grandTotalAmt,
      totalSellInQty: grandTotalQty,
    };
  }, [filteredSalesIn]);

  // 2. Aggregate Sell-In by Buyer (Retailer / Customer)
  const { buyerAggregates, totalBuyerAmount, totalBuyerQty } = React.useMemo(() => {
    const map = new Map<string, { grossAmount: number; returnsAmount: number; netAmount: number; qty: number }>();
    let grandTotalAmt = 0;
    let grandTotalQty = 0;

    filteredSalesIn.forEach((r) => {
      const buyer = (
        r.buyer_name ||
        r.buyer_code ||
        r.retailer_name ||
        r.retailer_group ||
        r.buyer ||
        r.customer_name ||
        r.retailer_id ||
        "Unknown Buyer"
      ).trim();
      const grossAmt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
      const returnsAmt = Number(r.cn_amount !== undefined ? r.cn_amount : (r.returns_amount || (Number(r.total_amount || 0) < 0 ? Math.abs(r.total_amount) : 0)));
      const netAmt = Number(r.nett_amount !== undefined ? r.nett_amount : (r.net_amount || r.total_amount || (grossAmt - returnsAmt)));
      const grossQty = Number(r.quantity !== undefined ? r.quantity : (r.gross_qty || (Number(r.total_qty || 0) > 0 ? r.total_qty : 0)));

      const existing = map.get(buyer) || { grossAmount: 0, returnsAmount: 0, netAmount: 0, qty: 0 };
      existing.grossAmount += grossAmt;
      existing.returnsAmount += returnsAmt;
      existing.netAmount += netAmt;
      existing.qty += grossQty;
      map.set(buyer, existing);

      grandTotalAmt += grossAmt;
      grandTotalQty += grossQty;
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1].grossAmount - a[1].grossAmount);

    const aggregates: BuyerData[] = entries.map(([buyer, stats], idx) => {
      const percentage = grandTotalAmt > 0 ? (stats.grossAmount / grandTotalAmt) * 100 : 0;
      const color = COLOR_LIST[idx % COLOR_LIST.length];
      return {
        buyer,
        grossAmount: stats.grossAmount,
        returnsAmount: stats.returnsAmount,
        netAmount: stats.netAmount,
        percentage,
        color,
        qty: stats.qty,
      };
    });

    return {
      buyerAggregates: aggregates,
      totalBuyerAmount: grandTotalAmt,
      totalBuyerQty: grandTotalQty,
    };
  }, [filteredSalesIn]);

  // Generate SVG Pie/Donut Chart Slices for Channels
  const channelPieSlices = React.useMemo(() => {
    return generatePieSlices(
      channelAggregates.map((c) => ({ key: c.channel, percentage: c.percentage, color: c.color })),
      totalSellInAmount
    );
  }, [channelAggregates, totalSellInAmount]);

  // Generate SVG Pie/Donut Chart Slices for Buyers
  const buyerPieSlices = React.useMemo(() => {
    return generatePieSlices(
      buyerAggregates.map((b) => ({ key: b.buyer, percentage: b.percentage, color: b.color })),
      totalBuyerAmount
    );
  }, [buyerAggregates, totalBuyerAmount]);

  // Filter 12-month records by selectedBrand
  const filtered12mRecords = React.useMemo(() => {
    const result: Record<string, any[]> = {};
    twelveMonths.forEach((m) => {
      const raw = twelveMonthRecords[m] || [];
      if (selectedBrand === "All Brands") {
        result[m] = raw;
      } else {
        const brandLower = selectedBrand.toLowerCase();
        result[m] = raw.filter((r) => {
          if (r.brand && r.brand.trim().toLowerCase() === brandLower) return true;
          const sku = (r.sku || r.prodcode || "").toLowerCase().trim();
          if (sku) {
            const matched = productsList.find(
              (p) => (p.sku || p.id || "").toLowerCase().trim() === sku
            );
            if (matched) {
              const b = matched.brand || matched.brand_name || matched.brand_assigned;
              if (b && typeof b === "string" && b.trim().toLowerCase() === brandLower) return true;
            }
          }
          return false;
        });
      }
    });
    return result;
  }, [twelveMonths, twelveMonthRecords, selectedBrand, productsList]);

  // Aggregate 12-Month Channel Trend
  const twelveMonthChannelData = React.useMemo(() => {
    const totalPerChannel = new Map<string, number>();
    twelveMonths.forEach((m) => {
      const recs = filtered12mRecords[m] || [];
      recs.forEach((r) => {
        const ch = (r.channel || r.sales_channel || "Retailer").trim();
        const amt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
        totalPerChannel.set(ch, (totalPerChannel.get(ch) || 0) + amt);
      });
    });

    const sortedChannels = Array.from(totalPerChannel.entries()).sort((a, b) => b[1] - a[1]);
    const topChannels = sortedChannels.slice(0, 5).map((e) => e[0]);
    const hasOther = sortedChannels.length > 5;

    const categories = [...topChannels];
    if (hasOther) categories.push("Other");

    const monthlyData = twelveMonths.map((m) => {
      const recs = filtered12mRecords[m] || [];
      const catMap: Record<string, number> = {};
      categories.forEach((c) => { catMap[c] = 0; });
      let monthTotal = 0;

      recs.forEach((r) => {
        const ch = (r.channel || r.sales_channel || "Retailer").trim();
        const amt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
        if (topChannels.includes(ch)) {
          catMap[ch] = (catMap[ch] || 0) + amt;
        } else if (hasOther) {
          catMap["Other"] = (catMap["Other"] || 0) + amt;
        }
        monthTotal += amt;
      });

      return {
        month: m,
        total: monthTotal,
        categories: catMap,
      };
    });

    let maxPointVal = 100;
    monthlyData.forEach((d) => {
      categories.forEach((cat) => {
        const val = d.categories[cat] || 0;
        if (val > maxPointVal) maxPointVal = val;
      });
    });
    const maxMonthVal = Math.ceil(maxPointVal * 1.15);

    const categoryColors: Record<string, string> = {};
    categories.forEach((cat, idx) => {
      if (cat === "Other") {
        categoryColors[cat] = "#94A3B8";
      } else {
        categoryColors[cat] = CHANNEL_PALETTE[cat] || COLOR_LIST[idx % COLOR_LIST.length];
      }
    });

    return {
      categories,
      categoryColors,
      monthlyData,
      maxMonthVal,
      totalPerCategory: totalPerChannel,
    };
  }, [twelveMonths, filtered12mRecords]);

  // Aggregate 12-Month Buyer Trend - Strictly Limit to Top 5 Buyers Only
  const twelveMonthBuyerData = React.useMemo(() => {
    const totalPerBuyer = new Map<string, number>();
    twelveMonths.forEach((m) => {
      const recs = filtered12mRecords[m] || [];
      recs.forEach((r) => {
        const b = (
          r.buyer_name ||
          r.buyer_code ||
          r.retailer_name ||
          r.retailer_group ||
          r.buyer ||
          r.customer_name ||
          r.retailer_id ||
          "Unknown Buyer"
        ).trim();
        const amt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
        totalPerBuyer.set(b, (totalPerBuyer.get(b) || 0) + amt);
      });
    });

    // Limit strictly to top 5 buyers only
    const sortedBuyers = Array.from(totalPerBuyer.entries()).sort((a, b) => b[1] - a[1]);
    const categories = sortedBuyers.slice(0, 5).map((e) => e[0]);

    const monthlyData = twelveMonths.map((m) => {
      const recs = filtered12mRecords[m] || [];
      const catMap: Record<string, number> = {};
      categories.forEach((c) => { catMap[c] = 0; });
      let monthTotal = 0;

      recs.forEach((r) => {
        const b = (
          r.buyer_name ||
          r.buyer_code ||
          r.retailer_name ||
          r.retailer_group ||
          r.buyer ||
          r.customer_name ||
          r.retailer_id ||
          "Unknown Buyer"
        ).trim();
        const amt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
        if (categories.includes(b)) {
          catMap[b] = (catMap[b] || 0) + amt;
          monthTotal += amt;
        }
      });

      return {
        month: m,
        total: monthTotal,
        categories: catMap,
      };
    });

    let maxPointVal = 100;
    monthlyData.forEach((d) => {
      categories.forEach((cat) => {
        const val = d.categories[cat] || 0;
        if (val > maxPointVal) maxPointVal = val;
      });
    });
    const maxMonthVal = Math.ceil(maxPointVal * 1.15);

    const categoryColors: Record<string, string> = {};
    categories.forEach((cat, idx) => {
      categoryColors[cat] = COLOR_LIST[idx % COLOR_LIST.length];
    });

    return {
      categories,
      categoryColors,
      monthlyData,
      maxMonthVal,
      totalPerCategory: totalPerBuyer,
    };
  }, [twelveMonths, filtered12mRecords]);

  // Active trend dataset based on toggle
  const activeTrendData = trendToggle === "channel" ? twelveMonthChannelData : twelveMonthBuyerData;

  const [brandDropdownOpen, setBrandDropdownOpen] = React.useState<boolean>(false);
  const brandDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close brand dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setBrandDropdownOpen(false);
      }
    }
    if (brandDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [brandDropdownOpen]);

  // Format Month Display (e.g., August 2026)
  const formatPeriodLabel = (p: string) => {
    try {
      const [y, m] = p.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleString("en-US", { month: "long", year: "numeric" });
    } catch {
      return p;
    }
  };

  const formatShortMonth = (p: string) => {
    try {
      const [y, m] = p.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleString("en-US", { month: "short" });
    } catch {
      return p;
    }
  };

  const formatCompactNum = (val: number) => {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (val >= 1_000) return (val / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="relative flex flex-col flex-1 h-full min-h-0 select-none font-primary animate-in fade-in duration-200">
      {/* 🚀 Top Header Toolbar: Centered Brand & Month Filters, with Add Chart / Reset on right */}
      <div className="w-full flex items-center justify-between pb-3 pt-0 shrink-0 z-30">
        <div className="w-24 hidden md:block" />

        {/* Center: Brand Dropdown & Month Filter Capsules (Directly centered under Workspace/Analysis/Forecast tabs) */}
        <div className="flex items-center justify-center gap-2.5">
          {/* Custom Styled Brand Dropdown Capsule - RIGID FIXED WIDTH w-[160px] */}
          <div className="relative shrink-0" ref={brandDropdownRef}>
            <button
              type="button"
              onClick={() => setBrandDropdownOpen((prev) => !prev)}
              className={`w-[160px] h-[30px] flex items-center justify-between px-3 rounded-full border shadow-2xs transition-all cursor-pointer ${
                brandDropdownOpen
                  ? "bg-white border-[#0B57D0] ring-2 ring-[#0B57D0]/15"
                  : "bg-[#F0F4F9] border-slate-200/90 hover:bg-[#E4ECF7]"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                <Tag size={12} className="text-[#0B57D0] shrink-0" />
                <span className="text-xs font-bold text-zinc-900 tracking-tight truncate text-left">
                  {selectedBrand}
                </span>
              </div>
              <ChevronDown
                size={12}
                className={`text-zinc-500 shrink-0 transition-transform duration-200 ${
                  brandDropdownOpen ? "rotate-180 text-[#0B57D0]" : ""
                }`}
              />
            </button>

            {/* Custom Dropdown Menu Card */}
            {brandDropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Select Brand</span>
                  <span className="text-[#0B57D0] font-semibold">{availableBrands.length}</span>
                </div>
                <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50">
                  {availableBrands.map((brand) => {
                    const isSelected = selectedBrand === brand;
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => {
                          setSelectedBrand(brand);
                          setBrandDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/70 text-[#0B57D0] font-bold"
                            : "text-zinc-700 hover:bg-slate-50 hover:text-zinc-900 font-medium"
                        }`}
                      >
                        <span className="truncate">{brand}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Month Filter Capsule with Left/Right Arrow Buttons - RIGID FIXED WIDTH w-[185px] */}
          <div className="w-[185px] h-[30px] flex items-center justify-between px-2 rounded-full bg-[#F0F4F9] border border-slate-200/90 shadow-2xs hover:bg-[#E4ECF7] transition-all shrink-0">
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={loading}
              className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-600 hover:text-[#0B57D0] hover:bg-white/80 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              title="Previous Month"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Month Label with Calendar Icon & Hidden Input Trigger */}
            <label className="relative flex items-center justify-center gap-1.5 flex-1 min-w-0 px-1 cursor-pointer">
              <Calendar size={12} className="text-[#0B57D0] shrink-0" />
              <span className="text-xs font-bold text-zinc-900 tracking-tight truncate whitespace-nowrap">
                {formatPeriodLabel(selectedMonth)}
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </label>

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={loading}
              className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-600 hover:text-[#0B57D0] hover:bg-white/80 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              title="Next Month"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right: + Add Chart & Reset Layout Dropdown */}
        <div className="flex items-center gap-2" ref={addDropdownRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddDropdownOpen((prev) => !prev)}
              className={`h-[30px] flex items-center gap-1.5 px-3 rounded-full border shadow-2xs text-xs font-bold transition-all cursor-pointer ${
                addDropdownOpen
                  ? "bg-white border-[#0B57D0] text-[#0B57D0] ring-2 ring-[#0B57D0]/15"
                  : "bg-white border-slate-200/90 text-zinc-700 hover:bg-[#F0F4F9]"
              }`}
            >
              <Plus size={13} className="text-[#0B57D0]" />
              <span>Charts</span>
              {layout.filter((it) => !it.visible).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0B57D0] text-white text-[10px] flex items-center justify-center font-bold">
                  {layout.filter((it) => !it.visible).length}
                </span>
              )}
            </button>

            {addDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Available Charts</span>
                  <button
                    type="button"
                    onClick={resetLayout}
                    className="text-[#0B57D0] hover:underline flex items-center gap-1 cursor-pointer font-bold capitalize text-[10.5px]"
                  >
                    <RotateCcw size={10} />
                    Reset All
                  </button>
                </div>

                <div className="p-1 divide-y divide-slate-50">
                  {layout.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.visible ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <span className="text-zinc-800 font-medium truncate">{item.title}</span>
                      </div>

                      {item.visible ? (
                        <button
                          type="button"
                          onClick={() => removeCard(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded cursor-pointer font-medium"
                        >
                          Hide
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addCard(item.id)}
                          className="text-xs text-[#0B57D0] hover:bg-blue-50 px-2 py-0.5 rounded cursor-pointer font-bold flex items-center gap-0.5"
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Analysis Body Area - Customizable Widget Board */}
      <div className="flex flex-row gap-4 flex-1 min-h-0 overflow-x-auto overflow-y-auto items-start pb-4">
        {layout
          .filter((it) => it.visible)
          .map((item) => {
            const isDragging = draggedId === item.id;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(item.id)}
                style={{ width: `${item.width}px`, height: `${item.height || 420}px` }}
                className={`shrink-0 flex flex-col bg-white rounded-xl border shadow-2xs p-3.5 relative select-none transition-shadow hover:shadow-xs group overflow-hidden ${
                  isDragging ? "opacity-40 border-dashed border-[#0B57D0]" : "border-slate-200/90"
                }`}
              >
                {/* Card Header with Drag Handle, Toggle (if 12m), and Remove Button */}
                <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-100 select-none shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                    <div
                      className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-600 p-0.5 rounded hover:bg-slate-100 transition-colors shrink-0"
                      title="Drag to reorder card"
                    >
                      <GripVertical size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-zinc-900 tracking-tight truncate">
                          {item.id === "channel_pie"
                            ? "Sell In by Channel"
                            : item.id === "buyer_pie"
                            ? "Sell In by Buyers"
                            : `12-Month ${trendToggle === "channel" ? "Channel" : "Buyer"} Trend`}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-[#0B57D0] text-[10px] font-bold border border-blue-100 shrink-0">
                          {item.id === "channel_pie"
                            ? channelAggregates.length
                            : item.id === "buyer_pie"
                            ? buyerAggregates.length
                            : `${activeTrendData.categories.length} ${trendToggle === "channel" ? "Channels" : "Buyers"}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-0.2 truncate">
                        {item.id === "trend_12m"
                          ? `${selectedBrand !== "All Brands" ? selectedBrand : "All Brands"} · ${twelveMonths[0]} ~ ${twelveMonths[11]}`
                          : selectedBrand !== "All Brands"
                          ? selectedBrand
                          : formatPeriodLabel(selectedMonth)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle Switch if 12m trend */}
                    {item.id === "trend_12m" && (
                      <div className="inline-flex p-0.5 rounded-full bg-[#F0F4F9] border border-slate-200/90 shadow-2xs gap-0.5 mr-1">
                        <button
                          type="button"
                          onClick={() => setTrendToggle("channel")}
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer ${
                            trendToggle === "channel"
                              ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          Channel
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendToggle("buyer")}
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer ${
                            trendToggle === "buyer"
                              ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          Buyer
                        </button>
                      </div>
                    )}

                    {/* Remove / Hide Card */}
                    <button
                      type="button"
                      onClick={() => removeCard(item.id)}
                      className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                      title="Remove / Hide this chart"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Card Body: 1. Channel Donut Pie */}
                {item.id === "channel_pie" && (
                  <div className="w-full flex flex-col items-center gap-2 flex-1 min-h-0 overflow-hidden">
                    {loading ? (
                      <div className="w-full flex-1 min-h-[220px] flex flex-col items-center justify-center text-center p-6 gap-2">
                        <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                        <span className="text-xs text-zinc-400 font-medium">Loading sales data...</span>
                      </div>
                    ) : channelAggregates.length === 0 || totalSellInAmount <= 0 ? (
                      <div className="w-full flex-1 min-h-[220px] flex flex-col items-center justify-center text-center p-6 gap-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-zinc-400 flex items-center justify-center border border-slate-200">
                          <PieChart size={20} />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800">No Channel Data</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[180px]">
                          No channel records found for period {selectedMonth}{selectedBrand !== "All Brands" ? ` under ${selectedBrand}` : ""}.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Visual SVG Donut Pie */}
                        <div className="relative w-52 h-52 flex items-center justify-center shrink-0 my-1">
                          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-0 transition-transform">
                            {channelPieSlices.map((slice) => {
                              const isHovered = hoveredChannel === slice.key;
                              return (
                                <path
                                  key={slice.key}
                                  d={slice.path}
                                  fill={slice.color}
                                  stroke="#FFFFFF"
                                  strokeWidth={isHovered ? "2.5" : "1.5"}
                                  className="cursor-pointer transition-all duration-200"
                                  style={{
                                    opacity: hoveredChannel && !isHovered ? 0.45 : 1,
                                    transform: isHovered ? "scale(1.03)" : "scale(1)",
                                    transformOrigin: "center",
                                  }}
                                  onMouseEnter={() => setHoveredChannel(slice.key)}
                                  onMouseLeave={() => setHoveredChannel(null)}
                                />
                              );
                            })}
                          </svg>

                          {/* Center Text inside Donut Hole */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                            {hoveredChannel ? (
                              (() => {
                                const target = channelAggregates.find((c) => c.channel === hoveredChannel);
                                if (!target) return null;
                                return (
                                  <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight truncate max-w-[90px]">
                                      {target.channel}
                                    </span>
                                    <span className="text-sm font-bold text-zinc-950 leading-tight">
                                      {target.percentage.toFixed(1)}%
                                    </span>
                                    <span className="text-[9.5px] text-[#0B57D0] font-semibold mt-0.5">
                                      ${target.grossAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                                  Total Sell-In
                                </span>
                                <span className="text-xs font-bold text-zinc-900 leading-tight mt-0.5">
                                  ${totalSellInAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-[9.5px] text-zinc-400 font-medium">
                                  {totalSellInQty.toLocaleString()} pcs
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Header Toggle */}
                        <button
                          type="button"
                          onClick={() => setShowChannelBreakdown((prev) => !prev)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-100/70 hover:bg-slate-200/70 text-zinc-600 transition-colors cursor-pointer shrink-0"
                        >
                          <span className="text-[11px] font-semibold tracking-tight text-zinc-700">
                            {showChannelBreakdown ? "Hide Channel Breakdown" : "View Channel Breakdown"}
                          </span>
                          <ChevronDown
                            size={13}
                            className={`text-zinc-500 transition-transform duration-200 ${
                              showChannelBreakdown ? "rotate-180 text-[#0B57D0]" : ""
                            }`}
                          />
                        </button>

                        {/* Collapsible Legend Breakdown */}
                        {showChannelBreakdown && (
                          <div className="w-full flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col divide-y divide-slate-100 text-xs animate-in fade-in slide-in-from-top-1 duration-150 pt-1 pr-0.5">
                            {channelAggregates.map((item) => {
                              const isHovered = hoveredChannel === item.channel;
                              return (
                                <div
                                  key={item.channel}
                                  onMouseEnter={() => setHoveredChannel(item.channel)}
                                  onMouseLeave={() => setHoveredChannel(null)}
                                  className={`py-2 px-1.5 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${
                                    isHovered ? "bg-slate-100/80 font-semibold" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs text-zinc-800 truncate">{item.channel}</span>
                                      <span className="text-[10px] text-zinc-400">
                                        {item.qty.toLocaleString()} pcs
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end shrink-0 pl-2">
                                    <span className="text-xs font-bold text-zinc-900">
                                      ${item.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10.5px] font-semibold text-[#0B57D0]">
                                      {item.percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Card Body: 2. Buyer Donut Pie */}
                {item.id === "buyer_pie" && (
                  <div className="w-full flex flex-col items-center gap-2 flex-1 min-h-0 overflow-hidden">
                    {loading ? (
                      <div className="w-full flex-1 min-h-[220px] flex flex-col items-center justify-center text-center p-6 gap-2">
                        <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                        <span className="text-xs text-zinc-400 font-medium">Loading sales data...</span>
                      </div>
                    ) : buyerAggregates.length === 0 || totalBuyerAmount <= 0 ? (
                      <div className="w-full flex-1 min-h-[220px] flex flex-col items-center justify-center text-center p-6 gap-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-zinc-400 flex items-center justify-center border border-slate-200">
                          <PieChart size={20} />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800">No Buyer Data</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[180px]">
                          No buyer records found for period {selectedMonth}{selectedBrand !== "All Brands" ? ` under ${selectedBrand}` : ""}.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Visual SVG Donut Pie */}
                        <div className="relative w-52 h-52 flex items-center justify-center shrink-0 my-1">
                          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-0 transition-transform">
                            {buyerPieSlices.map((slice) => {
                              const isHovered = hoveredBuyer === slice.key;
                              return (
                                <path
                                  key={slice.key}
                                  d={slice.path}
                                  fill={slice.color}
                                  stroke="#FFFFFF"
                                  strokeWidth={isHovered ? "2.5" : "1.5"}
                                  className="cursor-pointer transition-all duration-200"
                                  style={{
                                    opacity: hoveredBuyer && !isHovered ? 0.45 : 1,
                                    transform: isHovered ? "scale(1.03)" : "scale(1)",
                                    transformOrigin: "center",
                                  }}
                                  onMouseEnter={() => setHoveredBuyer(slice.key)}
                                  onMouseLeave={() => setHoveredBuyer(null)}
                                />
                              );
                            })}
                          </svg>

                          {/* Center Text inside Donut Hole */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                            {hoveredBuyer ? (
                              (() => {
                                const target = buyerAggregates.find((b) => b.buyer === hoveredBuyer);
                                if (!target) return null;
                                return (
                                  <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight truncate max-w-[90px]">
                                      {target.buyer}
                                    </span>
                                    <span className="text-sm font-bold text-zinc-950 leading-tight">
                                      {target.percentage.toFixed(1)}%
                                    </span>
                                    <span className="text-[9.5px] text-[#0B57D0] font-semibold mt-0.5">
                                      ${target.grossAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                                  Total Buyers
                                </span>
                                <span className="text-xs font-bold text-zinc-900 leading-tight mt-0.5">
                                  ${totalBuyerAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-[9.5px] text-zinc-400 font-medium">
                                  {totalBuyerQty.toLocaleString()} pcs
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Header Toggle */}
                        <button
                          type="button"
                          onClick={() => setShowBuyerBreakdown((prev) => !prev)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-100/70 hover:bg-slate-200/70 text-zinc-600 transition-colors cursor-pointer shrink-0"
                        >
                          <span className="text-[11px] font-semibold tracking-tight text-zinc-700">
                            {showBuyerBreakdown ? "Hide Buyers Breakdown" : "View Buyers Breakdown"}
                          </span>
                          <ChevronDown
                            size={13}
                            className={`text-zinc-500 transition-transform duration-200 ${
                              showBuyerBreakdown ? "rotate-180 text-[#0B57D0]" : ""
                            }`}
                          />
                        </button>

                        {/* Collapsible Legend Breakdown */}
                        {showBuyerBreakdown && (
                          <div className="w-full flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col divide-y divide-slate-100 text-xs animate-in fade-in slide-in-from-top-1 duration-150 pt-1 pr-0.5">
                            {buyerAggregates.map((item) => {
                              const isHovered = hoveredBuyer === item.buyer;
                              return (
                                <div
                                  key={item.buyer}
                                  onMouseEnter={() => setHoveredBuyer(item.buyer)}
                                  onMouseLeave={() => setHoveredBuyer(null)}
                                  className={`py-2 px-1.5 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${
                                    isHovered ? "bg-slate-100/80 font-semibold" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs text-zinc-800 truncate">{item.buyer}</span>
                                      <span className="text-[10px] text-zinc-400">
                                        {item.qty.toLocaleString()} pcs
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end shrink-0 pl-2">
                                    <span className="text-xs font-bold text-zinc-900">
                                      ${item.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10.5px] font-semibold text-[#0B57D0]">
                                      {item.percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Card Body: 3. 12-Month Performance Trend Line Chart */}
                {item.id === "trend_12m" && (
                  <div className="w-full flex flex-col items-center justify-between flex-1 min-h-0 relative">
                    {loading12m ? (
                      <div className="w-full flex-1 min-h-[160px] flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                        <span className="text-xs text-zinc-400 font-medium">Loading 12-month data...</span>
                      </div>
                    ) : (
                      <>
                        {/* SVG Multi-Line Chart */}
                        <div className="relative w-full flex-1 min-h-[160px]">
                          <svg viewBox="0 0 520 215" className="w-full h-full select-none overflow-visible">
                            {/* Horizontal Gridlines & Y-Axis Scale Values */}
                            {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
                              const y = 172 - ratio * 150;
                              const val = activeTrendData.maxMonthVal * ratio;
                              return (
                                <g key={idx}>
                                  <line
                                    x1="40"
                                    y1={y}
                                    x2="512"
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeDasharray={ratio === 0 ? "none" : "3,3"}
                                    strokeWidth={ratio === 0 ? "1" : "0.75"}
                                  />
                                  <text
                                    x="36"
                                    y={y + 3.5}
                                    textAnchor="end"
                                    className="text-[9px] fill-zinc-400 font-mono font-medium"
                                  >
                                    ${formatCompactNum(val)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Hovered Month Vertical Guideline & Highlight Band */}
                            {hoveredMonthIndex !== null && (() => {
                              const hX = 44 + hoveredMonthIndex * 42.1818;
                              return (
                                <g>
                                  <rect
                                    x={hX - 16}
                                    y="20"
                                    width="32"
                                    height="152"
                                    rx="4"
                                    fill="#0B57D0"
                                    fillOpacity="0.05"
                                  />
                                  <line
                                    x1={hX}
                                    y1="20"
                                    x2={hX}
                                    y2="172"
                                    stroke="#0B57D0"
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                    opacity="0.6"
                                  />
                                </g>
                              );
                            })()}

                            {/* Multi-Line Paths and Data Points per Category */}
                            {activeTrendData.categories.map((cat) => {
                              const color = activeTrendData.categoryColors[cat] || "#5F6368";
                              const isHoveredCategory = hoveredTrendCategory === cat;
                              const isDimmed = hoveredTrendCategory !== null && !isHoveredCategory;

                              const pts = activeTrendData.monthlyData.map((d, i) => {
                                const val = d.categories[cat] || 0;
                                const x = 44 + i * 42.1818;
                                const y = 172 - (activeTrendData.maxMonthVal > 0 ? (val / activeTrendData.maxMonthVal) * 150 : 0);
                                return { x, y, val };
                              });

                              const pathD = pts
                                .map((p, idx) => (idx === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`))
                                .join(" ");

                              return (
                                <g key={cat} className="transition-opacity duration-200" opacity={isDimmed ? 0.2 : 1}>
                                  {/* Glow line when hovered */}
                                  {isHoveredCategory && (
                                    <path
                                      d={pathD}
                                      fill="none"
                                      stroke={color}
                                      strokeWidth="7"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity="0.25"
                                    />
                                  )}

                                  {/* Main Data Line */}
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={isHoveredCategory ? 3 : 2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-200"
                                  />

                                  {/* Data Points / Circles along the line */}
                                  {pts.map((p, i) => {
                                    const isHoveredMonth = hoveredMonthIndex === i;
                                    return (
                                      <circle
                                        key={i}
                                        cx={p.x}
                                        cy={p.y}
                                        r={isHoveredMonth ? 4.5 : isHoveredCategory ? 3.5 : 2.5}
                                        fill="#FFFFFF"
                                        stroke={color}
                                        strokeWidth={isHoveredMonth ? 2.5 : 1.5}
                                        className="transition-all duration-150"
                                      />
                                    );
                                  })}
                                </g>
                              );
                            })}

                            {/* Month Labels, Active Indicators & Clickable Columns */}
                            {activeTrendData.monthlyData.map((data, i) => {
                              const x = 44 + i * 42.1818;
                              const isCurrentMonth = data.month === selectedMonth;
                              const isHovered = hoveredMonthIndex === i;

                              return (
                                <g key={data.month} className="cursor-pointer">
                                  {/* Month Label Text */}
                                  <text
                                    x={x}
                                    y="192"
                                    textAnchor="middle"
                                    className={`text-[9.5px] transition-colors ${
                                      isCurrentMonth
                                        ? "fill-[#0B57D0] font-bold"
                                        : isHovered
                                        ? "fill-zinc-800 font-semibold"
                                        : "fill-zinc-500 font-medium"
                                    }`}
                                  >
                                    {formatShortMonth(data.month)}
                                  </text>

                                  {/* Selected Month Indicator Dot */}
                                  {isCurrentMonth && (
                                    <circle cx={x} cy="203" r="2.5" fill="#0B57D0" />
                                  )}

                                  {/* Transparent Clickable / Hoverable Column Target */}
                                  <rect
                                    x={x - 20}
                                    y="15"
                                    width="40"
                                    height="195"
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredMonthIndex(i)}
                                    onMouseLeave={() => setHoveredMonthIndex(null)}
                                    onClick={() => setSelectedMonth(data.month)}
                                  />
                                </g>
                              );
                            })}
                          </svg>

                          {/* Interactive Floating Tooltip when Hovering a Month */}
                          {hoveredMonthIndex !== null && (
                            <div
                              className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-xs border border-slate-200 shadow-lg rounded-lg p-2 text-xs min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                              style={{
                                top: "10px",
                                left: hoveredMonthIndex > 6 ? "50px" : "auto",
                                right: hoveredMonthIndex <= 6 ? "50px" : "auto",
                              }}
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1.5">
                                <span className="font-bold text-zinc-900">
                                  {formatPeriodLabel(twelveMonths[hoveredMonthIndex])}
                                </span>
                                <span className="text-[#0B57D0] font-bold font-mono">
                                  ${activeTrendData.monthlyData[hoveredMonthIndex].total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                                {activeTrendData.categories
                                  .map((cat) => ({
                                    cat,
                                    amt: activeTrendData.monthlyData[hoveredMonthIndex].categories[cat] || 0,
                                    color: activeTrendData.categoryColors[cat],
                                  }))
                                  .sort((a, b) => b.amt - a.amt)
                                  .map((item) => (
                                    <div key={item.cat} className="flex items-center justify-between gap-2 text-[10.5px]">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-zinc-700 truncate max-w-[95px]">{item.cat}</span>
                                      </div>
                                      <span className="font-semibold text-zinc-900 font-mono shrink-0">
                                        ${item.amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interactive Legend Below Chart */}
                        <div className="w-full flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-2 mt-1 border-t border-slate-100 text-[10px]">
                          {activeTrendData.categories.map((cat) => {
                            const isHovered = hoveredTrendCategory === cat;
                            return (
                              <div
                                key={cat}
                                onMouseEnter={() => setHoveredTrendCategory(cat)}
                                onMouseLeave={() => setHoveredTrendCategory(null)}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                                  isHovered ? "bg-slate-100 font-bold shadow-2xs" : "hover:bg-slate-50"
                                }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                                  style={{ backgroundColor: activeTrendData.categoryColors[cat] }}
                                />
                                <span className="text-zinc-600 truncate max-w-[85px]">{cat}</span>
                                <span className="text-zinc-900 font-semibold font-mono">
                                  ${formatCompactNum(activeTrendData.totalPerCategory.get(cat) || 0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ↔️ Drag-to-Resize Right Border Handle (Width) */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "horizontal", e)}
                  className="absolute right-0 top-0 bottom-3 w-2 cursor-ew-resize hover:bg-[#0B57D0]/25 transition-colors z-20 group-hover:bg-slate-200/40"
                  title="Drag right edge to resize width"
                />

                {/* ↕️ Drag-to-Resize Bottom Border Handle (Height) */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "vertical", e)}
                  className="absolute left-0 right-3 bottom-0 h-2 cursor-ns-resize hover:bg-[#0B57D0]/25 transition-colors z-20 group-hover:bg-slate-200/40"
                  title="Drag bottom edge to resize height"
                />

                {/* ⤡ Drag-to-Resize Bottom-Right Corner Handle (Both Width & Height) */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "both", e)}
                  className="absolute right-0 bottom-0 w-3.5 h-3.5 cursor-se-resize flex items-end justify-end p-0.5 text-zinc-300 hover:text-[#0B57D0] z-30 transition-colors group-hover:text-zinc-400"
                  title="Drag corner to resize width and height"
                >
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current">
                    <path d="M8 2L2 8M8 5L5 8M8 8H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            );
          })}

        {/* Empty State when all charts are removed */}
        {layout.every((it) => !it.visible) && (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 border-dashed text-center mx-auto my-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400">
              <Layers size={22} />
            </div>
            <h4 className="text-sm font-bold text-zinc-800">No Charts Currently Visible</h4>
            <p className="text-xs text-zinc-500 max-w-sm">
              All charts have been hidden. You can add them back individually from "+ Charts" or reset the layout.
            </p>
            <button
              type="button"
              onClick={resetLayout}
              className="h-8 px-4 rounded-lg bg-[#0B57D0] text-white text-xs font-semibold hover:bg-[#0842A0] cursor-pointer"
            >
              Reset All Charts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
