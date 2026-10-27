"use client";

import * as React from "react";
import {
  ShoppingBag,
  Calendar,
  Award,
  Users,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { showToast } from "@/lib/toast";

export interface HsgOverviewTabProps {
  claims: any[];
  withdrawals: any[];
  events: any[];
  eventRsvps: any[];
  contests: any[];
  contestSubmissions: any[];
  users: any[];
  transactions: any[];
  loading?: boolean;
  onNavigateTab: (tabId: string, subTabId?: string) => void;
}

export function HsgOverviewTab({
  claims,
  withdrawals,
  events,
  eventRsvps,
  contests,
  contestSubmissions,
  users,
  transactions,
  loading = false,
  onNavigateTab,
}: HsgOverviewTabProps) {


  // Date Filtering State: By Week | By Month | By Year (100% Matching TikTok Module Report)
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [periodType, setPeriodType] = React.useState<"week" | "month" | "year">("month");
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYearStr);
  const [selectedWeekIndex, setSelectedWeekIndex] = React.useState<number>(0);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = React.useState<boolean>(false);
  const [pickerYear, setPickerYear] = React.useState<string>(currentYearStr);

  const formatMonthName = (yearMonth: string) => {
    if (!yearMonth) return "";
    const [yyyy, mm] = yearMonth.split("-");
    const date = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Available Years
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    years.add(currentYearStr);
    const addTs = (ts?: number) => {
      if (ts && ts > 0) years.add(String(new Date(ts).getFullYear()));
    };
    (claims || []).forEach((c) => addTs(c.timestamp || c.created_at));
    (withdrawals || []).forEach((w) => addTs(w.created_at));
    (transactions || []).forEach((t) => addTs(t.timestamp || t.created_at));
    const curY = new Date().getFullYear();
    for (let y = curY - 3; y <= curY + 1; y++) years.add(String(y));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [claims, withdrawals, transactions, currentYearStr]);

  // Available Weeks for selectedMonth
  const availableWeeks = React.useMemo(() => {
    if (!selectedMonth) return [];
    const [yyyyStr, mmStr] = selectedMonth.split("-");
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

      const startLabel = `${String(startD.getDate()).padStart(2, "0")}/${String(mm + 1).padStart(2, "0")}`;
      const endLabel = `${String(endD.getDate()).padStart(2, "0")}/${String(mm + 1).padStart(2, "0")}`;

      weeks.push({
        index: weekNum - 1,
        label: `Week ${weekNum} (${startLabel} - ${endLabel})`,
        startMs: new Date(yyyy, mm, currentStart, 0, 0, 0, 0).getTime(),
        endMs: new Date(yyyy, mm, endDayNum, 23, 59, 59, 999).getTime(),
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

  const handlePrevMonth = () => {
    const [yyyyStr, mmStr] = selectedMonth.split("-");
    let y = parseInt(yyyyStr);
    let m = parseInt(mmStr) - 1;
    if (m < 1) {
      y -= 1;
      m = 12;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [yyyyStr, mmStr] = selectedMonth.split("-");
    let y = parseInt(yyyyStr);
    let m = parseInt(mmStr) + 1;
    if (m > 12) {
      y += 1;
      m = 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  // Calculate Date Range Bounds according to selected Period (Week, Month, Year)
  const filterRange = React.useMemo(() => {
    if (periodType === "month") {
      if (!selectedMonth) return null;
      const [yyyyStr, mmStr] = selectedMonth.split("-");
      const yyyy = parseInt(yyyyStr);
      const mm = parseInt(mmStr) - 1;
      const start = new Date(yyyy, mm, 1, 0, 0, 0, 0).getTime();
      const end = new Date(yyyy, mm + 1, 0, 23, 59, 59, 999).getTime();
      return { start, end };
    }
    if (periodType === "week") {
      const wk = availableWeeks[selectedWeekIndex] || availableWeeks[0];
      if (!wk) return null;
      return { start: wk.startMs, end: wk.endMs };
    }
    if (periodType === "year") {
      const y = parseInt(selectedYear || currentYearStr);
      const start = new Date(y, 0, 1, 0, 0, 0, 0).getTime();
      const end = new Date(y, 11, 31, 23, 59, 59, 999).getTime();
      return { start, end };
    }
    return null;
  }, [periodType, selectedMonth, selectedYear, selectedWeekIndex, availableWeeks, currentYearStr]);

  // Filter datasets by selected range
  const filteredClaims = React.useMemo(() => {
    if (!filterRange) return claims;
    return claims.filter((c) => {
      const ts = Number(c.timestamp || c.created_at || 0);
      return ts >= filterRange.start && ts <= filterRange.end;
    });
  }, [claims, filterRange]);

  const filteredWithdrawals = React.useMemo(() => {
    if (!filterRange) return withdrawals;
    return withdrawals.filter((w) => {
      const ts = Number(w.created_at || 0);
      return ts >= filterRange.start && ts <= filterRange.end;
    });
  }, [withdrawals, filterRange]);

  const filteredEvents = React.useMemo(() => {
    if (!filterRange) return events;
    return events.filter((e) => {
      const ts = Number(e.date_timestamp || e.created_at || 0);
      return ts >= filterRange.start && ts <= filterRange.end;
    });
  }, [events, filterRange]);

  const filteredEventRsvps = React.useMemo(() => {
    if (!filterRange) return eventRsvps;
    return eventRsvps.filter((r) => {
      const ts = Number(r.checked_in_at || r.created_at || 0);
      return ts >= filterRange.start && ts <= filterRange.end;
    });
  }, [eventRsvps, filterRange]);

  const filteredContestSubmissions = React.useMemo(() => {
    if (!filterRange) return contestSubmissions;
    return contestSubmissions.filter((s) => {
      const ts = Number(s.created_at || 0);
      return ts >= filterRange.start && ts <= filterRange.end;
    });
  }, [contestSubmissions, filterRange]);

  // 1. Core KPIs based on filtered datasets
  const verifiedClaims = React.useMemo(
    () => filteredClaims.filter((c) => c.status === "credited" || c.status === "approved"),
    [filteredClaims]
  );
  const totalUnits = React.useMemo(
    () => verifiedClaims.reduce((s, c) => s + (Number(c.qty) || 1), 0),
    [verifiedClaims]
  );
  const totalRetailSpend = React.useMemo(
    () => verifiedClaims.reduce((s, c) => s + (Number(c.receipt_amount) || 0), 0),
    [verifiedClaims]
  );
  const totalCashbackCredited = React.useMemo(
    () => verifiedClaims.reduce((s, c) => s + (Number(c.cashback_amount) || 0), 0),
    [verifiedClaims]
  );

  const totalAttendees = React.useMemo(
    () => filteredEventRsvps.filter((r) => r.checked_in_at && Number(r.checked_in_at) > 0).length,
    [filteredEventRsvps]
  );
  const totalRsvps = filteredEventRsvps.length;
  const turnoutRate = totalRsvps > 0 ? Math.round((totalAttendees / totalRsvps) * 100) : 0;
  const activeEventsCount = React.useMemo(
    () => filteredEvents.filter((e) => e.is_active !== false).length,
    [filteredEvents]
  );

  const totalEntries = filteredContestSubmissions.length;
  const activeContestsCount = React.useMemo(
    () => contests.filter((c) => c.is_published && !c.is_archived).length,
    [contests]
  );

  const totalMembers = React.useMemo(
    () => users.filter((u) => !u.is_deleted && !String(u.phone_number || "").startsWith("DELETED_")).length,
    [users]
  );
  const activeStreakMembers = React.useMemo(
    () => users.filter((u) => !u.is_deleted && Number(u.weekly_streak) > 0).length,
    [users]
  );

  // 2. Action Required Queues
  const pendingClaims = React.useMemo(
    () => filteredClaims.filter((c) => c.status === "pending"),
    [filteredClaims]
  );
  const pendingWithdrawals = React.useMemo(
    () => filteredWithdrawals.filter((w) => w.status === "requested"),
    [filteredWithdrawals]
  );
  const pendingWithdrawalsAmount = React.useMemo(
    () => pendingWithdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0),
    [pendingWithdrawals]
  );

  // 3. Store Channels Breakdown
  const topStores = React.useMemo(() => {
    const storeMap: Record<string, { units: number; spend: number }> = {};
    const totalV = totalUnits || 1;

    verifiedClaims.forEach((c) => {
      const rawName = c.matched_outlet_name || c.outlet_id || "Retail Store";
      const cleanName = rawName.length > 24 ? rawName.slice(0, 24) + "..." : rawName;
      if (!storeMap[cleanName]) storeMap[cleanName] = { units: 0, spend: 0 };
      storeMap[cleanName].units += Number(c.qty || 1);
      storeMap[cleanName].spend += Number(c.receipt_amount || 0);
    });

    return Object.entries(storeMap)
      .map(([name, data]) => ({
        name,
        units: data.units,
        spend: data.spend,
        share: Math.round((data.units / totalV) * 100),
      }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [verifiedClaims, totalUnits]);

  // 4. Past 14 Days Timeline Trend
  const past14Days = React.useMemo(() => {
    const days: { label: string; purchases: number; community: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;

      const pCount = verifiedClaims.filter((c) => {
        const ts = Number(c.timestamp || c.created_at || 0);
        return ts >= dayStart && ts < dayEnd;
      }).length;

      const eCount = filteredEventRsvps.filter((r) => {
        const ts = Number(r.checked_in_at || 0);
        return ts >= dayStart && ts < dayEnd;
      }).length;

      const qCount = filteredContestSubmissions.filter((s) => {
        const ts = Number(s.created_at || 0);
        return ts >= dayStart && ts < dayEnd;
      }).length;

      days.push({
        label: d.toLocaleDateString("en-SG", { month: "numeric", day: "numeric" }),
        purchases: pCount,
        community: eCount + qCount,
      });
    }
    return days;
  }, [verifiedClaims, filteredEventRsvps, filteredContestSubmissions]);

  // SVG Trend Chart Geometry
  const chartHeight = 110;
  const chartWidth = 520;
  const maxVal = Math.max(
    1,
    ...past14Days.map((d) => Math.max(d.purchases, d.community))
  );

  const getPoints = (key: "purchases" | "community") => {
    return past14Days
      .map((d, idx) => {
        const x = (idx / (past14Days.length - 1)) * (chartWidth - 40) + 20;
        const y = chartHeight - (d[key] / maxVal) * (chartHeight - 24) - 12;
        return `${x},${y}`;
      })
      .join(" ");
  };

  // Direct Binary PDF Report Export
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const nowStr = new Date().toLocaleDateString("en-SG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text("HSG+ Community & Retail Performance Report", 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on ${nowStr} | Confidential Internal Operations`, 14, 24);

      autoTable(doc, {
        startY: 30,
        head: [["Category", "Performance Metric", "Volume / Value"]],
        body: [
          ["Product Purchases", `${totalUnits} Units Verified`, `$${totalRetailSpend.toFixed(2)} Store Spend`],
          ["Cashback Rewarded", `$${totalCashbackCredited.toFixed(2)} Credited`, `${verifiedClaims.length} Receipts Processed`],
          ["Physical Event Turnout", `${totalAttendees} Attendees Checked In`, `${turnoutRate}% Turnout Rate (${totalRsvps} RSVPs)`],
          ["Contest & Winners", `${totalEntries} Submissions`, `${activeContestsCount} Active Campaigns`],
          ["Community Members", `${totalMembers} Registered`, `${activeStreakMembers} Weekly Active`],
        ],
        theme: "striped",
        headStyles: { fillColor: [11, 87, 208], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });

      const lastY = (doc as any).lastAutoTable?.finalY || 80;
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Top Retail Channels (Verified Purchases)", 14, lastY + 12);

      const storeRows = topStores.map((st) => [
        st.name,
        `${st.units} units`,
        `$${st.spend.toFixed(2)}`,
        `${st.share}%`,
      ]);

      autoTable(doc, {
        startY: lastY + 16,
        head: [["Retailer / Supermarket", "Units Bought", "Spend Captured", "Share"]],
        body: storeRows.length > 0 ? storeRows : [["No verified store purchases yet", "-", "-", "-"]],
        theme: "striped",
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });

      doc.save(`HSG_Plus_Performance_Report_${new Date().toISOString().split("T")[0]}.pdf`);
      showToast("Report downloaded as PDF", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF report", "error");
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 font-primary text-slate-800 bg-[#F8F9FA] overflow-hidden">
      {/* =====================================================================
          LEFT COLUMN: ANALYTICS, TIMELINES & METRIC CARDS (Scrollable)
      ===================================================================== */}
      <div className="flex-1 min-w-0 w-full h-full flex flex-col overflow-y-auto space-y-4">
        {/* Top Controls Toolbar: Date Filter + Export (100% Match with TikTok Sales Report Module) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-lg bg-white border border-slate-200 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* By Week: Week selector dropdown */}
            {periodType === "week" && (
              <select
                value={selectedWeekIndex}
                onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value))}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#0B57D0] cursor-pointer shadow-2xs"
              >
                {availableWeeks.map((w) => (
                  <option key={w.index} value={w.index}>
                    {w.label}
                  </option>
                ))}
              </select>
            )}

            {/* Stepper with Month Name: For By Week & By Month */}
            {(periodType === "month" || periodType === "week") && (
              <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden h-8">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="h-full px-2 hover:bg-slate-50 text-zinc-500 hover:text-zinc-800 transition cursor-pointer border-r border-slate-200/80 flex items-center justify-center shrink-0"
                  title="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerYear(selectedMonth.split("-")[0] || String(new Date().getFullYear()));
                    setIsMonthPickerOpen(true);
                  }}
                  className="h-full w-[150px] px-2 hover:bg-slate-50 text-xs font-medium text-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  title="Click to select month"
                >
                  <Calendar size={13} className="text-[#0B57D0] shrink-0" />
                  <span className="truncate font-semibold">{formatMonthName(selectedMonth)}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="h-full px-2 transition border-l border-slate-200/80 flex items-center justify-center shrink-0 hover:bg-slate-50 text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* By Year: Year selector dropdown */}
            {periodType === "year" && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#0B57D0] cursor-pointer shadow-2xs"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            )}

            {/* Period Selector Tabs: By Week | By Month | By Year */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs ml-auto"
          >
            <Download size={13} className="text-zinc-500" />
            <span>Export PDF</span>
          </button>
        </div>

        {/* Action Required Queues Banner */}
        {(pendingClaims.length > 0 || pendingWithdrawals.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 shrink-0">
            <span className="font-semibold text-amber-950 flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Action Required:
            </span>
            {pendingClaims.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab("Cashback", "queue")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 font-semibold text-amber-900 hover:bg-amber-100/50 transition text-[11px]"
              >
                <span>{pendingClaims.length} Claims Pending</span>
                <ChevronRight className="w-3 h-3 text-amber-600" />
              </button>
            )}
            {pendingWithdrawals.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab("Members", "withdrawals")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 font-semibold text-amber-900 hover:bg-amber-100/50 transition text-[11px]"
              >
                <span>
                  {pendingWithdrawals.length} PayNow Payouts (${pendingWithdrawalsAmount.toFixed(2)})
                </span>
                <ChevronRight className="w-3 h-3 text-amber-600" />
              </button>
            )}
          </div>
        )}

        {/* 4 Core Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Purchases */}
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Purchases
              </span>
              <ShoppingBag className="w-4 h-4 text-[#0B57D0]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-slate-900">{totalUnits}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                ${totalRetailSpend.toFixed(2)} retail spend
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Cashback</span>
              <span className="font-semibold text-slate-700">${totalCashbackCredited.toFixed(2)}</span>
            </div>
          </div>

          {/* Card 2: Attendance */}
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Event Turnout
              </span>
              <Calendar className="w-4 h-4 text-[#0B57D0]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-slate-900">{totalAttendees}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {turnoutRate}% check-in ({totalRsvps} RSVPs)
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Events</span>
              <span className="font-semibold text-slate-700">{activeEventsCount} Active</span>
            </div>
          </div>

          {/* Card 3: Digital Participation */}
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Contest & Winners
              </span>
              <Award className="w-4 h-4 text-[#0B57D0]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-slate-900">{totalEntries}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Submissions received
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Contests</span>
              <span className="font-semibold text-slate-700">{activeContestsCount} Active</span>
            </div>
          </div>

          {/* Card 4: Community Members */}
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Members
              </span>
              <Users className="w-4 h-4 text-[#0B57D0]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-slate-900">{totalMembers}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Registered community members
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Active Streaks</span>
              <span className="font-semibold text-slate-700">{activeStreakMembers} Members</span>
            </div>
          </div>
        </div>

        {/* 14-Day Timeline Trend & Top Retail Stores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Trend Chart */}
          <div className="lg:col-span-2 p-4 rounded-lg bg-white border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Activity Trend</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Daily comparison of verified retail purchases and community activities.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B57D0]" />
                  <span className="text-slate-600 font-medium">Purchases</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="text-slate-600 font-medium">Community</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex-1 min-h-[140px] flex flex-col justify-end">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28 overflow-visible">
                <line x1="20" y1="15" x2={chartWidth - 20} y2="15" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="20" y1="55" x2={chartWidth - 20} y2="55" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="20" y1="95" x2={chartWidth - 20} y2="95" stroke="#F1F5F9" strokeWidth="1" />

                <polyline
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPoints("community")}
                />
                <polyline
                  fill="none"
                  stroke="#0B57D0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPoints("purchases")}
                />

                {past14Days.map((d, idx) => {
                  const x = (idx / (past14Days.length - 1)) * (chartWidth - 40) + 20;
                  const y = chartHeight - (d.purchases / maxVal) * (chartHeight - 24) - 12;
                  return (
                    <circle
                      key={`p-${idx}`}
                      cx={x}
                      cy={y}
                      r={d.purchases > 0 ? "3.5" : "2"}
                      fill="#0B57D0"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </svg>

              <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-3">
                {past14Days
                  .filter((_, idx) => idx % 2 === 0 || idx === past14Days.length - 1)
                  .map((d, idx) => (
                    <span key={idx}>{d.label}</span>
                  ))}
              </div>
            </div>
          </div>

          {/* Top Retail Stores */}
          <div className="p-4 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Top Retail Stores</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Outlets with highest verified purchase scan volume.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {topStores.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No store purchase data in this range.
                </div>
              ) : (
                topStores.map((st, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate">{st.name}</span>
                      <span className="font-normal text-slate-500 shrink-0">
                        {st.units} units ({st.share}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-[#0B57D0] rounded-full"
                        style={{ width: `${Math.max(4, st.share)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Claims Breakdown</span>
              <button
                type="button"
                onClick={() => onNavigateTab("Cashback", "queue")}
                className="text-[#0B57D0] hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All Claims</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Verified Activities Feed */}
        <div className="p-4 rounded-lg bg-white border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Recent Verified Activities</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Live chronological feed of approved purchases and member engagements.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("Cashback", "queue")}
              className="text-xs font-semibold text-[#0B57D0] hover:underline"
            >
              View All Claims
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Member</th>
                  <th className="pb-2">Store / Activity</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2 text-right">Cashback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {verifiedClaims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No verified activities recorded in this range.
                    </td>
                  </tr>
                ) : (
                  verifiedClaims.slice(0, 5).map((clm, idx) => (
                    <tr key={clm.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 text-slate-500">
                        {new Date(Number(clm.timestamp || clm.created_at || Date.now())).toLocaleDateString(
                          "en-SG",
                          { month: "short", day: "numeric" }
                        )}
                      </td>
                      <td className="py-2.5 font-medium text-slate-900">{clm.user_nickname}</td>
                      <td className="py-2.5">{clm.matched_outlet_name || clm.outlet_id || "Retail Outlet"}</td>
                      <td className="py-2.5">{clm.product_name} ({clm.qty}x)</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">
                        +${Number(clm.cashback_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      

      {/* =====================================================================
          CENTERED MONTH PICKER MODAL POPUP
      ===================================================================== */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4 select-none font-primary animate-in fade-in duration-100">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-[320px] p-4 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">Select Month</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-normal">Choose period for overview</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Year Selector Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 w-10">Year:</span>
              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                {availableYears.map((y) => {
                  const isSelected = y === pickerYear;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setPickerYear(y)}
                      className={`h-7 px-3 rounded-md text-xs font-medium transition cursor-pointer shrink-0 ${
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

            {/* 12 Months Grid */}
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
                { m: "12", label: "Dec" },
              ].map((item) => {
                const ym = `${pickerYear}-${item.m}`;
                const isCurrent = ym === selectedMonth;

                return (
                  <button
                    key={item.m}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(ym);
                      setIsMonthPickerOpen(false);
                    }}
                    className={`w-full h-9 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center box-border ${
                      isCurrent
                        ? "bg-[#0B57D0] text-white font-semibold shadow-xs border border-[#0B57D0] cursor-pointer"
                        : "bg-white hover:bg-blue-50 hover:text-[#0B57D0] hover:border-blue-300 text-zinc-800 border border-slate-200 shadow-2xs cursor-pointer"
                    }`}
                  >
                    {item.label}
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
