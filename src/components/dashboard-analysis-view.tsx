"use client";

import * as React from "react";
import { Calendar, RefreshCw, PieChart, Layers } from "lucide-react";
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

// Google Material / Workspace cohesive palette
const CHANNEL_PALETTE: Record<string, string> = {
  "Retailer": "#0B57D0",          // Google Deep Blue
  "Small Retailer": "#00838F",    // Cyan/Teal
  "Convenience Store": "#F29900", // Amber/Orange
  "Online": "#7C3AED",            // Purple/Indigo
  "Supermarket": "#1E8E3E",       // Green
  "Wholesale": "#D93025",         // Red/Crimson
  "Direct": "#E37400",            // Orange
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
  "#64748B",
];

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
  const [hoveredChannel, setHoveredChannel] = React.useState<string | null>(null);

  // Fetch sell-in batch data for the selected month
  const fetchMonthData = React.useCallback(async (period: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales-inout/batch-details?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSalesInData(Array.isArray(data.sales_in) ? data.sales_in : []);
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

  React.useEffect(() => {
    fetchMonthData(selectedMonth);
  }, [selectedMonth, fetchMonthData]);

  // Aggregate Sell-In by Sales Channel
  const { channelAggregates, totalSellInAmount, totalSellInQty } = React.useMemo(() => {
    const map = new Map<string, { grossAmount: number; returnsAmount: number; netAmount: number; qty: number }>();
    let grandTotalAmt = 0;
    let grandTotalQty = 0;

    salesInData.forEach((r) => {
      const channel = (r.sales_channel || "Retailer").trim();
      const grossAmt = Number(r.gross_amount || (Number(r.total_amount || 0) > 0 ? r.total_amount : 0));
      const returnsAmt = Number(r.returns_amount || (Number(r.total_amount || 0) < 0 ? Math.abs(r.total_amount) : 0));
      const netAmt = Number(r.net_amount || r.total_amount || (grossAmt - returnsAmt));
      const grossQty = Number(r.gross_qty || (Number(r.total_qty || 0) > 0 ? r.total_qty : 0));

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
  }, [salesInData]);

  // Generate SVG Pie/Donut Chart Slices
  const pieSlices = React.useMemo(() => {
    if (channelAggregates.length === 0 || totalSellInAmount <= 0) return [];

    let accumulatedAngle = 0;
    const radius = 70;
    const innerRadius = 45; // Donut style
    const cx = 100;
    const cy = 100;

    return channelAggregates.map((item) => {
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
  }, [channelAggregates, totalSellInAmount]);

  // Format Month Display
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
    <div className="flex flex-col flex-1 h-full min-h-0 select-none font-primary animate-in fade-in duration-200">
      {/* 🏛️ Top Controls Bar with Global Month Filter centered */}
      <div className="relative flex items-center justify-between px-4 py-2 bg-white border border-slate-200/90 rounded-xl shadow-2xs mb-3 shrink-0">
        {/* Left Section: Section Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EBF2FE] text-[#0B57D0] flex items-center justify-center font-bold text-xs shadow-2xs">
            <PieChart size={16} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xs font-bold text-zinc-950 leading-tight">Sales Analysis</h2>
            <span className="text-[10.5px] text-zinc-400">Sell-In Channel Distribution</span>
          </div>
        </div>

        {/* Center: Global Month Filter */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0F4F9] border border-slate-200/80 shadow-2xs hover:bg-[#E4ECF7] transition-all">
            <Calendar size={13} className="text-[#0B57D0]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-900 outline-none cursor-pointer"
            />
            <span className="text-[11px] font-medium text-zinc-500 hidden sm:inline">
              ({formatPeriodLabel(selectedMonth)})
            </span>
          </div>
        </div>

        {/* Right Section: Refresh & Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchMonthData(selectedMonth)}
            disabled={loading}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-zinc-700 cursor-pointer shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Analysis Data"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-[#0B57D0]" : "text-zinc-500"} />
            <span className="hidden sm:inline">{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Body Area */}
      <div className="flex flex-row gap-3 flex-1 min-h-0 overflow-hidden items-stretch">
        {/* Left Side: 300px Pie Chart Card */}
        <div className="w-[300px] shrink-0 h-full min-h-0 flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-zinc-900">Sell In by Channel</h3>
              <span className="text-[10px] text-zinc-400 mt-0.5">
                Gross Delivery Share • {formatPeriodLabel(selectedMonth)}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] text-[10px] font-bold border border-blue-100">
              {channelAggregates.length} {channelAggregates.length === 1 ? "Channel" : "Channels"}
            </span>
          </div>

          {/* Card Body: Donut / Pie Chart + Legend List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col items-center gap-4">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                <span className="text-xs text-zinc-400 font-medium">Loading sales data...</span>
              </div>
            ) : channelAggregates.length === 0 || totalSellInAmount <= 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-zinc-400 flex items-center justify-center border border-slate-200">
                  <PieChart size={20} />
                </div>
                <h4 className="text-xs font-bold text-zinc-800">No Sell-In Data</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[200px]">
                  No delivery records found for period {selectedMonth}.
                </p>
              </div>
            ) : (
              <>
                {/* Visual SVG Donut Pie */}
                <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-0 transition-transform">
                    {pieSlices.map((slice) => {
                      const isHovered = hoveredChannel === slice.channel;
                      return (
                        <path
                          key={slice.channel}
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
                          onMouseEnter={() => setHoveredChannel(slice.channel)}
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

                {/* Compact Legend / Channel Breakdown List */}
                <div className="w-full flex flex-col divide-y divide-slate-100 text-xs pt-1">
                  {channelAggregates.map((item) => {
                    const isHovered = hoveredChannel === item.channel;
                    return (
                      <div
                        key={item.channel}
                        onMouseEnter={() => setHoveredChannel(item.channel)}
                        onMouseLeave={() => setHoveredChannel(null)}
                        className={`py-2 px-1.5 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${
                          isHovered ? "bg-slate-50 font-semibold" : "hover:bg-slate-50/60"
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
              </>
            )}
          </div>

          {/* Footer Total Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0 font-medium">
            <span className="text-zinc-500 text-[11px]">Total Net Sales:</span>
            <span className="text-zinc-900 font-bold">
              ${channelAggregates.reduce((acc, c) => acc + c.netAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Right Side: Expansion Canvas for Next Modular Charts */}
        <div className="flex-1 min-w-0 h-full flex flex-col bg-white rounded-xl border border-dashed border-slate-200/90 shadow-2xs items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-zinc-400 mb-2">
            <Layers size={22} />
          </div>
          <h3 className="text-xs font-bold text-zinc-700">Analysis Module Canvas</h3>
          <p className="text-[11px] text-zinc-400 max-w-sm mt-1 leading-relaxed">
            Ready to add additional operational and performance charts one by one.
          </p>
        </div>
      </div>
    </div>
  );
}
