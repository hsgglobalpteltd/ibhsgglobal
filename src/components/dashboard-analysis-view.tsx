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
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ArrowRightLeft,
  Package,
  Sparkles,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export type ChartCardId =
  | "channel_pie"
  | "buyer_pie"
  | "trend_12m"
  | "sellin_vs_sellout"
  | "sell_through_rate"
  | "sku_movers";

export interface ChartLayoutItem {
  id: ChartCardId;
  title: string;
  visible: boolean;
  x: number;       // Exact pixel X coordinate on canvas
  y: number;       // Exact pixel Y coordinate on canvas
  width: number;   // Exact pixel width
  height: number;  // Exact pixel height
  zIndex?: number; // Layering order (Photoshop layers)
}

const DEFAULT_LAYOUT: ChartLayoutItem[] = [
  { id: "channel_pie", title: "Sell In by Channel", visible: true, x: 20, y: 20, width: 350, height: 440, zIndex: 1 },
  { id: "buyer_pie", title: "Sell In by Buyers", visible: true, x: 390, y: 20, width: 350, height: 440, zIndex: 2 },
  { id: "sell_through_rate", title: "Sell-Through Rate (%)", visible: true, x: 760, y: 20, width: 360, height: 440, zIndex: 3 },
  { id: "trend_12m", title: "12-Month Performance Trend", visible: true, x: 20, y: 480, width: 550, height: 460, zIndex: 4 },
  { id: "sellin_vs_sellout", title: "Sell-In vs Sell-Out Comparison", visible: true, x: 590, y: 480, width: 530, height: 460, zIndex: 5 },
  { id: "sku_movers", title: "Product Movement (Top & Bottom)", visible: true, x: 20, y: 960, width: 1100, height: 480, zIndex: 6 },
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

export interface DashboardAnalysisViewProps {
  onBack?: () => void;
}

export function DashboardAnalysisView({ onBack }: DashboardAnalysisViewProps = {}) {
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

  // 🛍️ Sell-Out Data & States
  const [sellOutData, setSellOutData] = React.useState<any[]>([]);
  const [loadingSellOut, setLoadingSellOut] = React.useState<boolean>(false);

  // Chart A (Sell-In vs Sell-Out) toggles
  const [soComparisonGroup, setSoComparisonGroup] = React.useState<"channel" | "buyer" | "brand">("channel");
  const [soComparisonMetric, setSoComparisonMetric] = React.useState<"amount" | "qty">("amount");
  const [hoveredComparisonBar, setHoveredComparisonBar] = React.useState<string | null>(null);

  // Chart B (Sell-Through Rate) toggles
  const [sellThroughGroup, setSellThroughGroup] = React.useState<"brand" | "buyer">("buyer");

  // Chart D (Product Movement) toggles
  const [skuMoverTab, setSkuMoverTab] = React.useState<"top" | "bottom">("top");

  // 📐 Photoshop-style Free-Form Canvas Layout State with LocalStorage Persistence
  const [layout, setLayout] = React.useState<ChartLayoutItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ib_dashboard_analysis_canvas_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = DEFAULT_LAYOUT.map((def, idx) => {
              const found = parsed.find((p: any) => p.id === def.id);
              if (!found) return def;
              return {
                ...def,
                ...found,
                x: typeof found.x === "number" ? Math.max(0, Math.round(found.x)) : def.x,
                y: typeof found.y === "number" ? Math.max(0, Math.round(found.y)) : def.y,
                width: typeof found.width === "number" && found.width >= 240 ? Math.round(found.width) : def.width,
                height: typeof found.height === "number" && found.height >= 220 ? Math.round(found.height) : def.height,
                zIndex: typeof found.zIndex === "number" ? found.zIndex : idx + 1,
              };
            });
            return merged;
          }
        }
      } catch {}
    }
    return DEFAULT_LAYOUT;
  });

  const updateLayout = React.useCallback((newLayout: ChartLayoutItem[]) => {
    setLayout(newLayout);
    try {
      localStorage.setItem("ib_dashboard_analysis_canvas_v2", JSON.stringify(newLayout));
    } catch {}
  }, []);

  // 🎨 Active Selected Widget & Photoshop Layer Ordering (Z-Index)
  const [selectedWidgetId, setSelectedWidgetId] = React.useState<string | null>(null);

  const bringToFront = React.useCallback((id: string) => {
    setSelectedWidgetId(id);
    setLayout((prev) => {
      const maxZ = Math.max(...prev.map((it) => it.zIndex || 1), 1);
      const current = prev.find((it) => it.id === id);
      if (current && current.zIndex === maxZ) return prev;
      const nextLayout = prev.map((it) => (it.id === id ? { ...it, zIndex: maxZ + 1 } : it));
      try {
        localStorage.setItem("ib_dashboard_analysis_canvas_v2", JSON.stringify(nextLayout));
      } catch {}
      return nextLayout;
    });
  }, []);

  // 🖱️ Free-Form Unconstrained Drag-and-Drop (Photoshop Object Move)
  const [draggingWidget, setDraggingWidget] = React.useState<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const handleDragStart = (id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);

    const currentItem = layout.find((it) => it.id === id);
    if (!currentItem) return;

    setDraggingWidget({
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentItem.x,
      initialY: currentItem.y,
    });
  };

  // 📐 Free-Form 8-Point Bounding Box Resizing (Photoshop Transform Handles)
  type ResizeHandleType = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

  const [resizingWidget, setResizingWidget] = React.useState<{
    id: string;
    handle: ResizeHandleType;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  const handleResizeStart = (
    id: string,
    handle: ResizeHandleType,
    e: React.MouseEvent
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);

    const currentItem = layout.find((it) => it.id === id);
    if (!currentItem) return;

    setResizingWidget({
      id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentItem.x,
      initialY: currentItem.y,
      initialWidth: currentItem.width,
      initialHeight: currentItem.height,
    });
  };

  // 🌐 Global Window Event Listeners for Unconstrained Dragging and Resizing
  React.useEffect(() => {
    if (!draggingWidget && !resizingWidget) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 1. Free Drag Move without Grid Lock or Snapback
      if (draggingWidget) {
        const deltaX = e.clientX - draggingWidget.startX;
        const deltaY = e.clientY - draggingWidget.startY;
        const newX = Math.max(0, Math.round(draggingWidget.initialX + deltaX));
        const newY = Math.max(0, Math.round(draggingWidget.initialY + deltaY));

        setLayout((prev) =>
          prev.map((it) => (it.id === draggingWidget.id ? { ...it, x: newX, y: newY } : it))
        );
      }

      // 2. Free Bounding Box Resizing without Grid Snap
      if (resizingWidget) {
        const deltaX = e.clientX - resizingWidget.startX;
        const deltaY = e.clientY - resizingWidget.startY;
        const { handle, initialX, initialY, initialWidth, initialHeight } = resizingWidget;

        const MIN_W = 260;
        const MIN_H = 220;

        let newX = initialX;
        let newY = initialY;
        let newW = initialWidth;
        let newH = initialHeight;

        // Horizontal sizing
        if (handle.includes("e")) {
          newW = Math.max(MIN_W, Math.round(initialWidth + deltaX));
        } else if (handle.includes("w")) {
          const calculatedW = Math.round(initialWidth - deltaX);
          if (calculatedW >= MIN_W) {
            newW = calculatedW;
            newX = Math.round(initialX + deltaX);
          } else {
            newW = MIN_W;
            newX = Math.round(initialX + (initialWidth - MIN_W));
          }
        }

        // Vertical sizing
        if (handle.includes("s")) {
          newH = Math.max(MIN_H, Math.round(initialHeight + deltaY));
        } else if (handle.includes("n")) {
          const calculatedH = Math.round(initialHeight - deltaY);
          if (calculatedH >= MIN_H) {
            newH = calculatedH;
            newY = Math.round(initialY + deltaY);
          } else {
            newH = MIN_H;
            newY = Math.round(initialY + (initialHeight - MIN_H));
          }
        }

        setLayout((prev) =>
          prev.map((it) =>
            it.id === resizingWidget.id
              ? {
                  ...it,
                  x: Math.max(0, newX),
                  y: Math.max(0, newY),
                  width: newW,
                  height: newH,
                }
              : it
          )
        );
      }
    };

    const handleMouseUp = () => {
      if (draggingWidget || resizingWidget) {
        setDraggingWidget(null);
        setResizingWidget(null);
        try {
          localStorage.setItem("ib_dashboard_analysis_canvas_v2", JSON.stringify(layout));
        } catch {}
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingWidget, resizingWidget, layout]);

  // 📏 Auto-Expanding Canvas Board Dimensions
  const canvasBounds = React.useMemo(() => {
    let maxX = 1380;
    let maxY = 1580;
    layout.forEach((it) => {
      if (it.visible) {
        if (it.x + it.width + 150 > maxX) maxX = it.x + it.width + 150;
        if (it.y + it.height + 150 > maxY) maxY = it.y + it.height + 150;
      }
    });
    return { width: maxX, height: maxY };
  }, [layout]);

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
    showToast("Dashboard canvas reset to default", "success");
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

  // Fetch sell-out batch data for the selected month
  const fetchSellOutData = React.useCallback(async (period: string, silent = false) => {
    if (!silent) setLoadingSellOut(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/batch-details?period=${encodeURIComponent(period)}`);
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data.records) ? data.records : [];
        setSellOutData(records);
      } else {
        setSellOutData([]);
      }
    } catch {
      setSellOutData([]);
    } finally {
      if (!silent) setLoadingSellOut(false);
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
    fetchSellOutData(selectedMonth);
  }, [selectedMonth, fetchMonthData, fetchSellOutData]);

  // Listen to Global TopBar #global-refresh-button 'db-refresh' event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      cache12m.current.clear();
      await Promise.all([
        fetchMonthData(selectedMonth, false),
        fetchSellOutData(selectedMonth, false),
        fetchMetadata()
      ]);
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [fetchMonthData, fetchSellOutData, fetchMetadata, selectedMonth]);

  // Derived available brands list from products, salesInData & sellOutData
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

    // Check sellOutData
    sellOutData.forEach((r) => {
      if (r.brand && typeof r.brand === "string" && r.brand.trim()) {
        brandSet.add(r.brand.trim());
      }
    });

    const list = Array.from(brandSet).sort();
    return ["All Brands", ...list];
  }, [productsList, salesInData, sellOutData]);

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

  // Filter sellOutData by selected brand
  const filteredSalesOut = React.useMemo(() => {
    if (selectedBrand === "All Brands") return sellOutData;
    const bLower = selectedBrand.toLowerCase().trim();

    return sellOutData.filter((r) => {
      if (r.brand && r.brand.trim().toLowerCase() === bLower) {
        return true;
      }
      const sku = (r.product_sku || r.sku || r.prodcode || "").toLowerCase().trim();
      if (sku) {
        const matched = productsList.find(
          (p) => (p.sku || p.id || "").toLowerCase().trim() === sku
        );
        if (matched) {
          const b = matched.brand || matched.brand_name || matched.brand_assigned;
          if (b && typeof b === "string" && b.trim().toLowerCase() === bLower) {
            return true;
          }
        }
      }
      return false;
    });
  }, [sellOutData, selectedBrand, productsList]);

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

  // 📊 Chart A: Sell-In vs Sell-Out Comparison Aggregates
  const comparisonData = React.useMemo(() => {
    const map = new Map<string, {
      label: string;
      sellInAmt: number;
      sellInQty: number;
      sellOutAmt: number;
      sellOutQty: number;
    }>();

    const getGroupKey = (r: any) => {
      if (soComparisonGroup === "channel") {
        return (r.channel || r.sales_channel || "Retailer").trim();
      }
      if (soComparisonGroup === "buyer") {
        return (
          r.buyer_name ||
          r.buyer_code ||
          r.retailer_name ||
          r.retailer_group ||
          r.buyer ||
          r.customer_name ||
          "Unknown Buyer"
        ).trim();
      }
      // brand
      let b = (r.brand || "").trim();
      if (!b) {
        const sku = (r.sku || r.product_sku || r.prodcode || "").toLowerCase().trim();
        const p = productsList.find((item) => (item.sku || item.id || "").toLowerCase().trim() === sku);
        if (p) b = (p.brand || p.brand_name || p.brand_assigned || "").trim();
      }
      return b || "Other Brand";
    };

    let totalInAmt = 0;
    let totalInQty = 0;
    let totalOutAmt = 0;
    let totalOutQty = 0;

    // Aggregate Sell-In
    filteredSalesIn.forEach((r) => {
      const key = getGroupKey(r);
      const amt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
      const qty = Number(r.quantity !== undefined ? r.quantity : (r.gross_qty || (Number(r.total_qty || 0) > 0 ? r.total_qty : 0)));

      const cur = map.get(key) || { label: key, sellInAmt: 0, sellInQty: 0, sellOutAmt: 0, sellOutQty: 0 };
      cur.sellInAmt += amt;
      cur.sellInQty += qty;
      map.set(key, cur);

      totalInAmt += amt;
      totalInQty += qty;
    });

    // Aggregate Sell-Out
    filteredSalesOut.forEach((r) => {
      const key = getGroupKey(r);
      const amt = Number(r.sales_amount || 0);
      const qty = Number(r.sales_quantity || 0);

      const cur = map.get(key) || { label: key, sellInAmt: 0, sellInQty: 0, sellOutAmt: 0, sellOutQty: 0 };
      cur.sellOutAmt += amt;
      cur.sellOutQty += qty;
      map.set(key, cur);

      totalOutAmt += amt;
      totalOutQty += qty;
    });

    // Sort by combined volume and take top 6
    const all = Array.from(map.values());
    all.sort((a, b) => {
      const volA = soComparisonMetric === "amount" ? (a.sellInAmt + a.sellOutAmt) : (a.sellInQty + a.sellOutQty);
      const volB = soComparisonMetric === "amount" ? (b.sellInAmt + b.sellOutAmt) : (b.sellInQty + b.sellOutQty);
      return volB - volA;
    });

    const items = all.slice(0, 6);

    let maxVal = 100;
    items.forEach((it) => {
      const inVal = soComparisonMetric === "amount" ? it.sellInAmt : it.sellInQty;
      const outVal = soComparisonMetric === "amount" ? it.sellOutAmt : it.sellOutQty;
      if (inVal > maxVal) maxVal = inVal;
      if (outVal > maxVal) maxVal = outVal;
    });
    maxVal = Math.ceil(maxVal * 1.15);

    return {
      items,
      maxVal,
      totalInAmt,
      totalInQty,
      totalOutAmt,
      totalOutQty,
      gapAmt: totalInAmt - totalOutAmt,
      gapQty: totalInQty - totalOutQty,
    };
  }, [filteredSalesIn, filteredSalesOut, soComparisonGroup, soComparisonMetric, productsList]);

  // ⚡ Chart B: Sell-Through Rate Aggregates
  const sellThroughData = React.useMemo(() => {
    const map = new Map<string, { label: string; inQty: number; outQty: number; inAmt: number; outAmt: number }>();

    filteredSalesIn.forEach((r) => {
      let key = "Other";
      if (sellThroughGroup === "brand") {
        let b = (r.brand || "").trim();
        if (!b) {
          const sku = (r.sku || r.prodcode || "").toLowerCase().trim();
          const p = productsList.find((item) => (item.sku || item.id || "").toLowerCase().trim() === sku);
          if (p) b = (p.brand || p.brand_name || p.brand_assigned || "").trim();
        }
        key = b || "Other";
      } else {
        key = (
          r.buyer_name ||
          r.buyer_code ||
          r.retailer_name ||
          r.retailer_group ||
          r.buyer ||
          r.customer_name ||
          "Unknown Buyer"
        ).trim();
      }

      const qty = Number(r.quantity !== undefined ? r.quantity : (r.gross_qty || (Number(r.total_qty || 0) > 0 ? r.total_qty : 0)));
      const amt = Number(r.total_demand !== undefined ? r.total_demand : (r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0)));
      const cur = map.get(key) || { label: key, inQty: 0, outQty: 0, inAmt: 0, outAmt: 0 };
      cur.inQty += qty;
      cur.inAmt += amt;
      map.set(key, cur);
    });

    filteredSalesOut.forEach((r) => {
      let key = "Other";
      if (sellThroughGroup === "brand") {
        let b = (r.brand || "").trim();
        if (!b) {
          const sku = (r.product_sku || r.sku || r.prodcode || "").toLowerCase().trim();
          const p = productsList.find((item) => (item.sku || item.id || "").toLowerCase().trim() === sku);
          if (p) b = (p.brand || p.brand_name || p.brand_assigned || "").trim();
        }
        key = b || "Other";
      } else {
        key = (
          r.buyer_name ||
          r.buyer_code ||
          r.retailer_name ||
          r.retailer_group ||
          r.buyer ||
          r.customer_name ||
          "Unknown Buyer"
        ).trim();
      }

      const qty = Number(r.sales_quantity || 0);
      const amt = Number(r.sales_amount || 0);
      const cur = map.get(key) || { label: key, inQty: 0, outQty: 0, inAmt: 0, outAmt: 0 };
      cur.outQty += qty;
      cur.outAmt += amt;
      map.set(key, cur);
    });

    let overallInQty = 0;
    let overallOutQty = 0;

    const list = Array.from(map.values())
      .filter((it) => it.inQty > 0 || it.outQty > 0)
      .map((it) => {
        overallInQty += it.inQty;
        overallOutQty += it.outQty;
        const rate = it.inQty > 0 ? (it.outQty / it.inQty) * 100 : (it.outQty > 0 ? 100 : 0);
        return {
          ...it,
          rate,
        };
      })
      .sort((a, b) => b.outQty - a.outQty);

    const overallRate = overallInQty > 0 ? (overallOutQty / overallInQty) * 100 : 0;

    return {
      items: list.slice(0, 10),
      overallRate,
      overallInQty,
      overallOutQty,
    };
  }, [filteredSalesIn, filteredSalesOut, sellThroughGroup, productsList]);

  // 🏆 Chart D: Top 5 & Bottom 5 Product Movers
  const skuMoversData = React.useMemo(() => {
    const map = new Map<string, {
      sku: string;
      name: string;
      brand: string;
      inQty: number;
      outQty: number;
      outAmt: number;
    }>();

    filteredSalesIn.forEach((r) => {
      const sku = (r.sku || r.prodcode || r.product_sku || "SKU-UNKNOWN").trim();
      let brand = (r.brand || "").trim();
      let name = (r.product_name || r.raw_product_description || sku).trim();

      const p = productsList.find((item) => (item.sku || item.id || "").toLowerCase().trim() === sku.toLowerCase());
      if (p) {
        if (!brand) brand = (p.brand || p.brand_name || p.brand_assigned || "").trim();
        if (name === sku && (p.name || p.product_name)) name = (p.name || p.product_name).trim();
      }

      const qty = Number(r.quantity !== undefined ? r.quantity : (r.gross_qty || (Number(r.total_qty || 0) > 0 ? r.total_qty : 0)));
      const cur = map.get(sku) || { sku, name, brand: brand || "Brand", inQty: 0, outQty: 0, outAmt: 0 };
      cur.inQty += qty;
      map.set(sku, cur);
    });

    filteredSalesOut.forEach((r) => {
      const sku = (r.product_sku || r.sku || r.prodcode || "SKU-UNKNOWN").trim();
      let brand = (r.brand || "").trim();
      let name = (r.product_name || r.raw_product_description || sku).trim();

      const p = productsList.find((item) => (item.sku || item.id || "").toLowerCase().trim() === sku.toLowerCase());
      if (p) {
        if (!brand) brand = (p.brand || p.brand_name || p.brand_assigned || "").trim();
        if (name === sku && (p.name || p.product_name)) name = (p.name || p.product_name).trim();
      }

      const qty = Number(r.sales_quantity || 0);
      const amt = Number(r.sales_amount || 0);
      const cur = map.get(sku) || { sku, name, brand: brand || "Brand", inQty: 0, outQty: 0, outAmt: 0 };
      cur.outQty += qty;
      cur.outAmt += amt;
      map.set(sku, cur);
    });

    const all = Array.from(map.values());

    // Top 5 Movers: Highest outQty
    const topMovers = [...all]
      .filter((it) => it.outQty > 0)
      .sort((a, b) => b.outQty - a.outQty)
      .slice(0, 5);

    // Bottom 5 Bottlenecks: Delivered in Sell-In, but lowest sell-out (biggest stock gap)
    const bottomMovers = [...all]
      .filter((it) => it.inQty > 0)
      .sort((a, b) => (b.inQty - b.outQty) - (a.inQty - a.outQty))
      .slice(0, 5);

    return {
      topMovers,
      bottomMovers,
      totalSkus: all.length,
    };
  }, [filteredSalesIn, filteredSalesOut, productsList]);

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
    <div className="relative flex flex-col flex-1 h-full w-full min-h-0 select-none font-primary animate-in fade-in duration-200 p-0 m-0 overflow-hidden">
      {/* 🚀 Top Header Toolbar: Centered Brand & Month Filters, with Add Chart / Reset on right */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shrink-0 z-30">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
          )}
          {!onBack && <div className="w-24 hidden md:block" />}
        </div>

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

      {/* 🎨 Photoshop Free-Form Canvas Area */}
      <div
        onClick={() => setSelectedWidgetId(null)}
        className="flex-1 min-h-0 overflow-auto bg-[#F4F6F9] rounded-none border-none select-none relative w-full h-full p-0 m-0"
      >
        <div
          className="relative"
          style={{
            width: `${canvasBounds.width}px`,
            height: `${canvasBounds.height}px`,
            minWidth: "100%",
            minHeight: "100%",
          }}
        >
          {/* Subtle Canvas Dot Grid Pattern (Photoshop / Figma Blank Board style) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 [background-image:radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:24px_24px]"
            aria-hidden="true"
          />

          {/* Freely Positioned Widgets on Canvas */}
          {layout
            .filter((it) => it.visible)
            .map((item) => {
              const isSelected = selectedWidgetId === item.id;
              const isDraggingThis = draggingWidget?.id === item.id;

              return (
                <div
                  key={item.id}
                  data-chart-card
                  onClick={(e) => {
                    e.stopPropagation();
                    bringToFront(item.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    width: `${item.width}px`,
                    height: `${item.height}px`,
                    zIndex: item.zIndex || 1,
                  }}
                  className={`flex flex-col bg-white rounded-xl border shadow-sm p-3.5 select-none transition-shadow duration-100 group ${
                    isSelected
                      ? "ring-2 ring-[#0B57D0] border-[#0B57D0] shadow-xl"
                      : "border-slate-200/90 hover:border-slate-300 hover:shadow-md"
                  } ${isDraggingThis ? "cursor-grabbing opacity-90 shadow-2xl" : ""}`}
                >
                  {/* Card Header (Acts as primary free move drag handle) */}
                  <div
                    onMouseDown={(e) => handleDragStart(item.id, e)}
                    className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-100 select-none shrink-0 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1 pointer-events-none">
                      <div
                        className="text-zinc-400 group-hover:text-zinc-600 p-0.5 rounded transition-colors shrink-0"
                        title="Drag to move freely on canvas"
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
                            : item.id === "trend_12m"
                            ? `12-Month ${trendToggle === "channel" ? "Channel" : "Buyer"} Trend`
                            : item.id === "sellin_vs_sellout"
                            ? "Sell-In vs Sell-Out"
                            : item.id === "sell_through_rate"
                            ? "Sell-Through Rate (%)"
                            : "Product Movers (Top & Bottom)"}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-[#0B57D0] text-[10px] font-bold border border-blue-100 shrink-0">
                          {item.id === "channel_pie"
                            ? channelAggregates.length
                            : item.id === "buyer_pie"
                            ? buyerAggregates.length
                            : item.id === "trend_12m"
                            ? `${activeTrendData.categories.length} ${trendToggle === "channel" ? "Channels" : "Buyers"}`
                            : item.id === "sellin_vs_sellout"
                            ? `${comparisonData.items.length} ${soComparisonGroup}s`
                            : item.id === "sell_through_rate"
                            ? `${sellThroughData.items.length} ${sellThroughGroup}s`
                            : `${skuMoversData.totalSkus} SKUs`}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-0.2 truncate">
                        {item.id === "trend_12m"
                          ? `${selectedBrand !== "All Brands" ? selectedBrand : "All Brands"} · ${twelveMonths[0]} ~ ${twelveMonths[11]}`
                          : selectedBrand !== "All Brands"
                          ? `${selectedBrand} · ${formatPeriodLabel(selectedMonth)}`
                          : formatPeriodLabel(selectedMonth)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Group inside Card Header */}
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 shrink-0"
                  >
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

                    {/* Toggle Switches if Sell-In vs Sell-Out */}
                    {item.id === "sellin_vs_sellout" && (
                      <div className="flex items-center gap-1 mr-1">
                        {/* Group Toggle */}
                        <div className="inline-flex p-0.5 rounded-full bg-[#F0F4F9] border border-slate-200/90 shadow-2xs gap-0.5">
                          {(["channel", "buyer", "brand"] as const).map((grp) => (
                            <button
                              key={grp}
                              type="button"
                              onClick={() => setSoComparisonGroup(grp)}
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer capitalize ${
                                soComparisonGroup === grp
                                  ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                                  : "text-zinc-600 hover:text-zinc-950"
                              }`}
                            >
                              {grp}
                            </button>
                          ))}
                        </div>
                        {/* Metric Toggle ($ vs Qty) */}
                        <div className="inline-flex p-0.5 rounded-full bg-[#F0F4F9] border border-slate-200/90 shadow-2xs gap-0.5">
                          <button
                            type="button"
                            onClick={() => setSoComparisonMetric("amount")}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              soComparisonMetric === "amount"
                                ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                                : "text-zinc-600 hover:text-zinc-950"
                            }`}
                          >
                            $
                          </button>
                          <button
                            type="button"
                            onClick={() => setSoComparisonMetric("qty")}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              soComparisonMetric === "qty"
                                ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                                : "text-zinc-600 hover:text-zinc-950"
                            }`}
                          >
                            Qty
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Toggle Switch if Sell-Through Rate */}
                    {item.id === "sell_through_rate" && (
                      <div className="inline-flex p-0.5 rounded-full bg-[#F0F4F9] border border-slate-200/90 shadow-2xs gap-0.5 mr-1">
                        <button
                          type="button"
                          onClick={() => setSellThroughGroup("buyer")}
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer ${
                            sellThroughGroup === "buyer"
                              ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          Buyer
                        </button>
                        <button
                          type="button"
                          onClick={() => setSellThroughGroup("brand")}
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer ${
                            sellThroughGroup === "brand"
                              ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          Brand
                        </button>
                      </div>
                    )}

                    {/* Toggle Switch if Product Movers */}
                    {item.id === "sku_movers" && (
                      <div className="inline-flex p-0.5 rounded-full bg-[#F0F4F9] border border-slate-200/90 shadow-2xs gap-0.5 mr-1">
                        <button
                          type="button"
                          onClick={() => setSkuMoverTab("top")}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                            skuMoverTab === "top"
                              ? "bg-white text-emerald-600 shadow-xs font-bold"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          Top 5
                        </button>
                        <button
                          type="button"
                          onClick={() => setSkuMoverTab("bottom")}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                            skuMoverTab === "bottom"
                              ? "bg-white text-rose-600 shadow-xs font-bold"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          Bottom 5
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

                {/* Card Body: 4. Sell-In vs Sell-Out Grouped Comparison Chart */}
                {item.id === "sellin_vs_sellout" && (
                  <div className="w-full flex flex-col justify-between flex-1 min-h-0 relative">
                    {loadingSellOut || loading ? (
                      <div className="w-full flex-1 min-h-[160px] flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                        <span className="text-xs text-zinc-400 font-medium">Comparing Sell-In & Sell-Out data...</span>
                      </div>
                    ) : comparisonData.items.length === 0 ? (
                      <div className="w-full flex-1 min-h-[160px] flex flex-col items-center justify-center text-center p-6 gap-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-zinc-400 flex items-center justify-center border border-slate-200">
                          <BarChart3 size={20} />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800">No Comparison Data</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[200px]">
                          No records found for period {selectedMonth}{selectedBrand !== "All Brands" ? ` under ${selectedBrand}` : ""}.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Summary Metrics Strip */}
                        <div className="grid grid-cols-3 gap-2 px-1 py-1.5 mb-1 bg-[#F8F9FA] rounded-lg border border-slate-100 text-center shrink-0">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#0B57D0]">
                              Total Sell-In
                            </span>
                            <span className="text-xs font-bold text-zinc-900 font-mono">
                              {soComparisonMetric === "amount"
                                ? `$${formatCompactNum(comparisonData.totalInAmt)}`
                                : `${comparisonData.totalInQty.toLocaleString()} pcs`}
                            </span>
                          </div>
                          <div className="flex flex-col border-x border-slate-200/80">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#00838F]">
                              Total Sell-Out
                            </span>
                            <span className="text-xs font-bold text-zinc-900 font-mono">
                              {soComparisonMetric === "amount"
                                ? `$${formatCompactNum(comparisonData.totalOutAmt)}`
                                : `${comparisonData.totalOutQty.toLocaleString()} pcs`}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              Absorption Gap
                            </span>
                            <span className={`text-xs font-bold font-mono ${
                              (soComparisonMetric === "amount" ? comparisonData.gapAmt : comparisonData.gapQty) >= 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}>
                              {soComparisonMetric === "amount"
                                ? `${comparisonData.gapAmt >= 0 ? "+" : ""}$${formatCompactNum(comparisonData.gapAmt)}`
                                : `${comparisonData.gapQty >= 0 ? "+" : ""}${comparisonData.gapQty.toLocaleString()} pcs`}
                            </span>
                          </div>
                        </div>

                        {/* SVG Grouped Bar Chart */}
                        <div className="relative w-full flex-1 min-h-[160px] overflow-hidden">
                          <svg viewBox="0 0 520 185" className="w-full h-full select-none overflow-visible">
                            {/* Horizontal Gridlines */}
                            {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
                              const y = 145 - ratio * 125;
                              const val = comparisonData.maxVal * ratio;
                              return (
                                <g key={idx}>
                                  <line
                                    x1="45"
                                    y1={y}
                                    x2="512"
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeDasharray={ratio === 0 ? "none" : "3,3"}
                                    strokeWidth={ratio === 0 ? "1" : "0.75"}
                                  />
                                  <text
                                    x="40"
                                    y={y + 3.5}
                                    textAnchor="end"
                                    className="text-[9px] fill-zinc-400 font-mono font-medium"
                                  >
                                    {soComparisonMetric === "amount" ? `$${formatCompactNum(val)}` : formatCompactNum(val)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Grouped Bars per Category */}
                            {comparisonData.items.map((catItem, idx) => {
                              const slotWidth = (512 - 50) / comparisonData.items.length;
                              const slotX = 50 + idx * slotWidth;
                              const barWidth = Math.min(22, (slotWidth - 14) / 2);
                              const groupCenterX = slotX + slotWidth / 2;

                              const inVal = soComparisonMetric === "amount" ? catItem.sellInAmt : catItem.sellInQty;
                              const outVal = soComparisonMetric === "amount" ? catItem.sellOutAmt : catItem.sellOutQty;

                              const inHeight = comparisonData.maxVal > 0 ? (inVal / comparisonData.maxVal) * 125 : 0;
                              const outHeight = comparisonData.maxVal > 0 ? (outVal / comparisonData.maxVal) * 125 : 0;

                              const inY = 145 - inHeight;
                              const outY = 145 - outHeight;

                              const isHovered = hoveredComparisonBar === catItem.label;

                              return (
                                <g
                                  key={catItem.label}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredComparisonBar(catItem.label)}
                                  onMouseLeave={() => setHoveredComparisonBar(null)}
                                >
                                  {/* Hover background column */}
                                  {isHovered && (
                                    <rect
                                      x={slotX + 2}
                                      y="15"
                                      width={slotWidth - 4}
                                      height="132"
                                      rx="4"
                                      fill="#0B57D0"
                                      fillOpacity="0.04"
                                    />
                                  )}

                                  {/* Sell-In Bar (Blue) */}
                                  <rect
                                    x={groupCenterX - barWidth - 1.5}
                                    y={inY}
                                    width={barWidth}
                                    height={Math.max(2, inHeight)}
                                    rx="3"
                                    fill="#0B57D0"
                                    className="transition-all duration-200"
                                    opacity={hoveredComparisonBar && !isHovered ? 0.4 : 1}
                                  />

                                  {/* Sell-Out Bar (Teal) */}
                                  <rect
                                    x={groupCenterX + 1.5}
                                    y={outY}
                                    width={barWidth}
                                    height={Math.max(2, outHeight)}
                                    rx="3"
                                    fill="#00838F"
                                    className="transition-all duration-200"
                                    opacity={hoveredComparisonBar && !isHovered ? 0.4 : 1}
                                  />

                                  {/* Category Label below */}
                                  <text
                                    x={groupCenterX}
                                    y="164"
                                    textAnchor="middle"
                                    className={`text-[9px] transition-colors ${
                                      isHovered ? "fill-[#0B57D0] font-bold" : "fill-zinc-600 font-medium"
                                    }`}
                                  >
                                    {catItem.label.length > 10 ? `${catItem.label.slice(0, 9)}…` : catItem.label}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>

                          {/* Hover Tooltip Float */}
                          {hoveredComparisonBar && (() => {
                            const target = comparisonData.items.find((it) => it.label === hoveredComparisonBar);
                            if (!target) return null;
                            const inV = soComparisonMetric === "amount" ? target.sellInAmt : target.sellInQty;
                            const outV = soComparisonMetric === "amount" ? target.sellOutAmt : target.sellOutQty;
                            const diff = inV - outV;

                            return (
                              <div className="absolute top-2 right-2 bg-zinc-900/95 text-white rounded-lg shadow-xl px-2.5 py-1.5 text-[11px] pointer-events-none z-30 animate-in fade-in duration-100 flex flex-col gap-0.5 border border-zinc-700/50">
                                <span className="font-bold text-zinc-200 border-b border-zinc-700 pb-0.5 max-w-[150px] truncate">
                                  {target.label}
                                </span>
                                <div className="flex items-center justify-between gap-3 text-[10px]">
                                  <span className="text-blue-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0]" />
                                    Sell-In:
                                  </span>
                                  <span className="font-mono font-bold">
                                    {soComparisonMetric === "amount" ? `$${formatCompactNum(inV)}` : inV.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[10px]">
                                  <span className="text-teal-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#00838F]" />
                                    Sell-Out:
                                  </span>
                                  <span className="font-mono font-bold">
                                    {soComparisonMetric === "amount" ? `$${formatCompactNum(outV)}` : outV.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[10px] pt-0.5 border-t border-zinc-700/80">
                                  <span className="text-zinc-400">Net Gap:</span>
                                  <span className={`font-mono font-bold ${diff >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                    {diff >= 0 ? "+" : ""}{soComparisonMetric === "amount" ? `$${formatCompactNum(diff)}` : diff.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Legend */}
                        <div className="w-full flex items-center justify-center gap-4 pt-2 mt-1 border-t border-slate-100 text-[10.5px] shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#0B57D0] shadow-2xs" />
                            <span className="text-zinc-600 font-medium">Sell-In (Wholesale)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#00838F] shadow-2xs" />
                            <span className="text-zinc-600 font-medium">Sell-Out (Retail POS)</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Card Body: 5. Sell-Through Rate (%) Performance */}
                {item.id === "sell_through_rate" && (
                  <div className="w-full flex flex-col flex-1 min-h-0 relative">
                    {loadingSellOut || loading ? (
                      <div className="w-full flex-1 min-h-[160px] flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                        <span className="text-xs text-zinc-400 font-medium">Calculating Sell-Through Rate...</span>
                      </div>
                    ) : sellThroughData.items.length === 0 ? (
                      <div className="w-full flex-1 min-h-[160px] flex flex-col items-center justify-center text-center p-6 gap-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-zinc-400 flex items-center justify-center border border-slate-200">
                          <TrendingUp size={20} />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800">No Sell-Through Data</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[180px]">
                          Requires both Sell-In and Sell-Out data to compute velocity.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Overall Sell-Through KPI Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50/60 to-slate-50 rounded-lg border border-blue-100/60 mb-2 shrink-0">
                          <div className="flex flex-col">
                            <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider">
                              Average Sell-Through
                            </span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className="text-lg font-black text-zinc-950 font-mono">
                                {sellThroughData.overallRate.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                ({sellThroughData.overallOutQty.toLocaleString()} / {sellThroughData.overallInQty.toLocaleString()} pcs)
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            sellThroughData.overallRate >= 70
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : sellThroughData.overallRate >= 40
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {sellThroughData.overallRate >= 70
                              ? "High Velocity"
                              : sellThroughData.overallRate >= 40
                              ? "Balanced"
                              : "Slow / Overstock"}
                          </span>
                        </div>

                        {/* Ranked Velocity Progress List */}
                        <div className="w-full flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col divide-y divide-slate-100 pr-0.5">
                          {sellThroughData.items.map((row) => {
                            const isHigh = row.rate >= 70;
                            const isMid = row.rate >= 40 && row.rate < 70;

                            return (
                              <div key={row.label} className="py-2 px-1 flex flex-col gap-1 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                                    <span className="text-xs font-semibold text-zinc-800 truncate">
                                      {row.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      {row.outQty.toLocaleString()} / {row.inQty.toLocaleString()} pcs
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border ${
                                      isHigh
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : isMid
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}>
                                      {row.rate.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, row.rate))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Card Body: 6. Product Movement (Top 5 & Bottom 5 SKUs) */}
                {item.id === "sku_movers" && (
                  <div className="w-full flex flex-col flex-1 min-h-0 relative">
                    {loadingSellOut || loading ? (
                      <div className="w-full flex-1 min-h-[160px] flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                        <span className="text-xs text-zinc-400 font-medium">Analyzing SKU movements...</span>
                      </div>
                    ) : skuMoversData.totalSkus === 0 ? (
                      <div className="w-full flex-1 min-h-[160px] flex flex-col items-center justify-center text-center p-6 gap-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-zinc-400 flex items-center justify-center border border-slate-200">
                          <Package size={20} />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800">No SKU Data</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[180px]">
                          No product movement records found for this period.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Tab Subtitle Header */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 mb-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            {skuMoverTab === "top" ? (
                              <ArrowUpRight size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowDownRight size={14} className="text-rose-600 shrink-0" />
                            )}
                            <span className="text-[11px] font-bold text-zinc-800">
                              {skuMoverTab === "top" ? "Bestselling SKUs (High Demand)" : "Bottleneck SKUs (Overstock / Stagnant)"}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            Ranked by {skuMoverTab === "top" ? "Sell-Out Qty" : "Inventory Gap"}
                          </span>
                        </div>

                        {/* List of 5 Movers */}
                        <div className="w-full flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col divide-y divide-slate-100 pr-0.5">
                          {(skuMoverTab === "top" ? skuMoversData.topMovers : skuMoversData.bottomMovers).map((skuItem, rankIdx) => {
                            const gap = skuItem.inQty - skuItem.outQty;
                            const isTop = skuMoverTab === "top";

                            return (
                              <div
                                key={skuItem.sku}
                                className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {/* Rank Badge */}
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    rankIdx === 0
                                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                                      : rankIdx === 1
                                      ? "bg-slate-200 text-slate-700"
                                      : rankIdx === 2
                                      ? "bg-amber-50 text-amber-900/70"
                                      : "bg-slate-100 text-zinc-600"
                                  }`}>
                                    {rankIdx + 1}
                                  </span>

                                  {/* Product Description */}
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold text-zinc-900 truncate">
                                      {skuItem.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5 truncate">
                                      <span className="font-mono">{skuItem.sku}</span>
                                      <span>·</span>
                                      <span className="text-[#0B57D0] font-medium">{skuItem.brand}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Stats */}
                                <div className="flex flex-col items-end shrink-0 pl-1">
                                  {isTop ? (
                                    <>
                                      <span className="text-xs font-bold text-zinc-900 font-mono">
                                        {skuItem.outQty.toLocaleString()} sold
                                      </span>
                                      <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                                        ${formatCompactNum(skuItem.outAmt)} retail
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs font-bold text-rose-600 font-mono">
                                        +{gap > 0 ? gap.toLocaleString() : 0} unsold
                                      </span>
                                      <span className="text-[10px] text-zinc-400 font-mono">
                                        {skuItem.outQty.toLocaleString()} / {skuItem.inQty.toLocaleString()} pcs
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 🎨 Photoshop 8-Point Bounding Box Transform Handles */}
                {/* Top Edge */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "n", e)}
                  className="absolute -top-1 left-2 right-2 h-2.5 cursor-n-resize z-30 flex items-center justify-center group/handle"
                  title="Resize Top"
                >
                  <div
                    className={`w-2 h-1 bg-white border border-[#0B57D0] rounded-2xs shadow-xs transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover/handle:opacity-100"
                    }`}
                  />
                </div>

                {/* Bottom Edge */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "s", e)}
                  className="absolute -bottom-1 left-2 right-2 h-2.5 cursor-s-resize z-30 flex items-center justify-center group/handle"
                  title="Resize Bottom"
                >
                  <div
                    className={`w-2 h-1 bg-white border border-[#0B57D0] rounded-2xs shadow-xs transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover/handle:opacity-100"
                    }`}
                  />
                </div>

                {/* Left Edge */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "w", e)}
                  className="absolute -left-1 top-2 bottom-2 w-2.5 cursor-w-resize z-30 flex items-center justify-center group/handle"
                  title="Resize Left"
                >
                  <div
                    className={`w-1 h-2 bg-white border border-[#0B57D0] rounded-2xs shadow-xs transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover/handle:opacity-100"
                    }`}
                  />
                </div>

                {/* Right Edge */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "e", e)}
                  className="absolute -right-1 top-2 bottom-2 w-2.5 cursor-e-resize z-30 flex items-center justify-center group/handle"
                  title="Resize Right"
                >
                  <div
                    className={`w-1 h-2 bg-white border border-[#0B57D0] rounded-2xs shadow-xs transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover/handle:opacity-100"
                    }`}
                  />
                </div>

                {/* Top-Left Corner */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "nw", e)}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 cursor-nwse-resize z-30 flex items-center justify-center"
                  title="Resize Corner (Top-Left)"
                >
                  <div
                    className={`w-2 h-2 bg-white border border-[#0B57D0] rounded-2xs shadow-xs ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>

                {/* Top-Right Corner */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "ne", e)}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 cursor-nesw-resize z-30 flex items-center justify-center"
                  title="Resize Corner (Top-Right)"
                >
                  <div
                    className={`w-2 h-2 bg-white border border-[#0B57D0] rounded-2xs shadow-xs ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>

                {/* Bottom-Left Corner */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "sw", e)}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 cursor-nesw-resize z-30 flex items-center justify-center"
                  title="Resize Corner (Bottom-Left)"
                >
                  <div
                    className={`w-2 h-2 bg-white border border-[#0B57D0] rounded-2xs shadow-xs ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>

                {/* Bottom-Right Corner */}
                <div
                  onMouseDown={(e) => handleResizeStart(item.id, "se", e)}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 cursor-nwse-resize z-30 flex items-center justify-center"
                  title="Resize Corner (Bottom-Right)"
                >
                  <div
                    className={`w-2 h-2 bg-white border border-[#0B57D0] rounded-2xs shadow-xs ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>
              </div>
            );
          })}

          {/* Empty State when all charts are removed */}
          {layout.every((it) => !it.visible) && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 border-dashed text-center mx-auto gap-3 shadow-sm">
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
    </div>
  );
}
