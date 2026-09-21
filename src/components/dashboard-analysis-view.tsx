"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, PieChart, Layers, Tag } from "lucide-react";
import { showToast } from "@/lib/toast";

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
        setSalesInData(Array.isArray(data.records) ? data.records : (Array.isArray(data.sales_in) ? data.sales_in : []));
        if (Array.isArray(data.channels) && data.channels.length > 0) {
          setChannelsList(data.channels);
        }
      } else {
        setSalesInData([]);
      }
    } catch (err: any) {
      if (!silent) showToast("Failed to load sales data: " + err.message, "error");
      setSalesInData([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  return (
    <div className="relative flex flex-col flex-1 h-full min-h-0 select-none font-primary animate-in fade-in duration-200">
      {/* 🚀 Floating Right Filter Capsules (Brand Dropdown Capsule + Month Capsule with Left/Right Buttons) */}
      <div className="absolute top-0 right-0 z-30 flex items-center gap-2">
        {/* Custom Styled Brand Dropdown Capsule */}
        <div className="relative flex items-center" ref={brandDropdownRef}>
          <button
            type="button"
            onClick={() => setBrandDropdownOpen((prev) => !prev)}
            className={`h-[30px] flex items-center gap-1.5 px-3 rounded-full border shadow-2xs transition-all cursor-pointer ${
              brandDropdownOpen
                ? "bg-white border-[#0B57D0] ring-2 ring-[#0B57D0]/15"
                : "bg-[#F0F4F9] border-slate-200/90 hover:bg-[#E4ECF7]"
            }`}
          >
            <Tag size={12} className="text-[#0B57D0] shrink-0" />
            <span className="text-xs font-bold text-zinc-900 tracking-tight max-w-[140px] truncate">
              {selectedBrand}
            </span>
            <ChevronDown
              size={12}
              className={`text-zinc-500 transition-transform duration-200 ${
                brandDropdownOpen ? "rotate-180 text-[#0B57D0]" : ""
              }`}
            />
          </button>

          {/* Custom Dropdown Menu Card */}
          {brandDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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

        {/* Month Filter Capsule with Left/Right Arrow Buttons */}
        <div className="h-[30px] flex items-center gap-1 px-2.5 rounded-full bg-[#F0F4F9] border border-slate-200/90 shadow-2xs hover:bg-[#E4ECF7] transition-all">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={loading}
            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-600 hover:text-[#0B57D0] hover:bg-white/80 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            title="Previous Month"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Month Label with Calendar Icon & Hidden Input Trigger */}
          <label className="relative flex items-center gap-1.5 px-1 cursor-pointer">
            <Calendar size={12} className="text-[#0B57D0] shrink-0" />
            <span className="text-xs font-bold text-zinc-900 tracking-tight whitespace-nowrap">
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
            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-600 hover:text-[#0B57D0] hover:bg-white/80 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            title="Next Month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Analysis Body Area */}
      <div className="flex flex-row gap-4 flex-1 min-h-0 overflow-x-auto overflow-y-hidden items-start pb-1">
        {/* ========================================================= */}
        {/* 1. Left Side: Clean Pie Chart - Sell In by Channel        */}
        {/* ========================================================= */}
        <div className="w-[280px] shrink-0 flex flex-col items-center bg-transparent">
          {/* Centered Title & Channel Count */}
          <div className="w-full flex flex-col items-center text-center pb-2">
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-xs font-bold text-zinc-900 tracking-tight">Sell In by Channel</h3>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-[#0B57D0] text-[10px] font-bold border border-blue-100">
                {channelAggregates.length}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5">
              {selectedBrand !== "All Brands" ? selectedBrand : formatPeriodLabel(selectedMonth)}
            </span>
          </div>

          {/* Clean 1:1 Aspect Ratio Donut Pie + Collapsible Legend */}
          <div className="w-full flex flex-col items-center gap-3">
            {loading ? (
              <div className="w-[280px] h-[280px] flex flex-col items-center justify-center text-center p-6 gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                <span className="text-xs text-zinc-400 font-medium">Loading sales data...</span>
              </div>
            ) : channelAggregates.length === 0 || totalSellInAmount <= 0 ? (
              <div className="w-[280px] h-[280px] flex flex-col items-center justify-center text-center p-6 gap-2">
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
                {/* Visual SVG Donut Pie (1:1 Ratio Area) */}
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

                {/* Collapsible Legend / Channel Breakdown List (Max 4 items visible, scrollable without scrollbar) */}
                {showChannelBreakdown && (
                  <div className="w-full max-h-[176px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col divide-y divide-slate-100 text-xs animate-in fade-in slide-in-from-top-1 duration-150 pt-1 pr-0.5">
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
        </div>

        {/* ========================================================= */}
        {/* 2. Left Side: Clean Pie Chart - Sell In by Buyers         */}
        {/* ========================================================= */}
        <div className="w-[280px] shrink-0 flex flex-col items-center bg-transparent">
          {/* Centered Title & Buyer Count */}
          <div className="w-full flex flex-col items-center text-center pb-2">
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-xs font-bold text-zinc-900 tracking-tight">Sell In by Buyers</h3>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-[#0B57D0] text-[10px] font-bold border border-blue-100">
                {buyerAggregates.length}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5">
              {selectedBrand !== "All Brands" ? selectedBrand : formatPeriodLabel(selectedMonth)}
            </span>
          </div>

          {/* Clean 1:1 Aspect Ratio Donut Pie + Collapsible Legend */}
          <div className="w-full flex flex-col items-center gap-3">
            {loading ? (
              <div className="w-[280px] h-[280px] flex flex-col items-center justify-center text-center p-6 gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                <span className="text-xs text-zinc-400 font-medium">Loading sales data...</span>
              </div>
            ) : buyerAggregates.length === 0 || totalBuyerAmount <= 0 ? (
              <div className="w-[280px] h-[280px] flex flex-col items-center justify-center text-center p-6 gap-2">
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
                {/* Visual SVG Donut Pie (1:1 Ratio Area) */}
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

                {/* Collapsible Legend / Buyer Breakdown List (Max 4 items visible, scrollable without scrollbar) */}
                {showBuyerBreakdown && (
                  <div className="w-full max-h-[176px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col divide-y divide-slate-100 text-xs animate-in fade-in slide-in-from-top-1 duration-150 pt-1 pr-0.5">
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
        </div>

        {/* Right Area: Empty flex-1 space */}
        <div className="flex-1 min-w-0 h-full" />
      </div>
    </div>
  );
}
