"use client";

import * as React from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Printer, 
  RefreshCw, 
  Search, 
  Clock, 
  X, 
  Filter, 
  Building2, 
  Maximize2
} from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface CalendarEventModuleProps {
  profile?: any;
}

interface ActivationEvent {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  daily_schedule?: Array<{ date: string; start_time: string; end_time: string; day_number?: number }>;
  participants: string[];
  status: string;
  foc_description?: string;
  created_by?: string;
  created_at?: number;
}

interface PromoterScheduleEvent {
  id: string;
  campaign_id: string;
  campaign_title: string;
  promoter_id: string;
  promoter_name: string;
  store_id: string;
  store_name: string;
  store_address: string;
  date: number; // Unix timestamp
  start_time: string;
  end_time: string;
  status: string;
  tasks?: string;
  remarks?: string;
}

export interface UnifiedCalendarItem {
  id: string;
  type: "activation" | "promoter";
  title: string;
  location: string;
  who: string;
  timeDisplay: string;
  startMinutes: number;
  status: string;
  raw: ActivationEvent | PromoterScheduleEvent;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Parses time strings like "10:00", "10:30 AM", "2:00 PM", "14:00" to minutes from midnight for sorting.
 */
const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();
  if (clean === "all day" || clean === "full day" || !clean) return 0;

  // Extract the starting time portion if range provided (e.g. "10:00 - 18:00")
  const firstPart = clean.split(/[-–—to]/)[0].trim();
  
  const match = firstPart.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const anyMatch = firstPart.match(/(\d{1,2}):(\d{2})/);
  if (anyMatch) {
    let h = parseInt(anyMatch[1], 10);
    const m = parseInt(anyMatch[2], 10);
    if (firstPart.includes("pm") && h < 12) h += 12;
    if (firstPart.includes("am") && h === 12) h = 0;
    return h * 60 + m;
  }

  return 0;
};

export function CalendarEventModule({ profile }: CalendarEventModuleProps) {
  const [activeTab, setActiveTab] = React.useState<string>("calendar");
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [loading, setLoading] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  // Raw Events State
  const [activations, setActivations] = React.useState<ActivationEvent[]>([]);
  const [schedules, setSchedules] = React.useState<PromoterScheduleEvent[]>([]);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = React.useState<"all" | "activation" | "promoter">("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Selected Date Cell for Grow-Up Expanded Modal View
  const [expandedDate, setExpandedDate] = React.useState<Date | null>(null);

  // Print Tab State
  const [printLayout, setPrintLayout] = React.useState<"calendar" | "agenda">("calendar");
  const [printMonth, setPrintMonth] = React.useState<number>(new Date().getMonth());
  const [printYear, setPrintYear] = React.useState<number>(new Date().getFullYear());
  const [printTypeFilter, setPrintTypeFilter] = React.useState<"all" | "activation" | "promoter">("all");

  const tabs = React.useMemo(() => [
    { id: "calendar", label: "Calendar" },
    { id: "print", label: "Print" }
  ], []);

  // Fetch Calendar Data from dedicated endpoint
  const loadCalendarData = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/calendar-events`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json() as any;
      if (data.success) {
        setActivations(data.activations || []);
        setSchedules(data.schedules || []);
      } else {
        throw new Error(data.error || "Failed to load events");
      }
    } catch (err: any) {
      showToast("Error loading calendar events: " + err.message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Global refresh button event listener
  React.useEffect(() => {
    const handleGlobalRefresh = () => {
      loadCalendarData(true);
    };
    window.addEventListener("db-refresh", handleGlobalRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleGlobalRefresh);
    };
  }, [loadCalendarData]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Grid Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Determine starting weekday offset (0 = Mon, 6 = Sun)
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  // Calendar days array
  const calendarCells = React.useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        isCurrentMonth: true
      });
    }

    // Next month padding days to complete standard 35 or 42 grid
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let n = 1; n <= remaining; n++) {
      cells.push({
        date: new Date(year, month + 1, n),
        isCurrentMonth: false
      });
    }

    return cells;
  }, [year, month, startingDayIndex, daysInMonth]);

  // Helper to check if two dates match YYYY-MM-DD
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Helper to format Date to YYYY-MM-DD
  const formatDateToYMD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Check if an activation spans across a date
  const isActivationOnDate = (act: ActivationEvent, targetDate: Date): boolean => {
    const targetYMD = formatDateToYMD(targetDate);
    const startYMD = act.start_date || "";
    const endYMD = act.end_date || startYMD;

    if (!startYMD) return false;
    if (startYMD === targetYMD) return true;
    if (endYMD && startYMD <= targetYMD && targetYMD <= endYMD) return true;
    return false;
  };

  // Check if a promoter schedule falls on a date
  const isScheduleOnDate = (sch: PromoterScheduleEvent, targetDate: Date): boolean => {
    if (!sch.date) return false;
    const schDate = new Date(sch.date);
    return isSameDay(schDate, targetDate);
  };

  // Get and sort all events for a specific cell date by time
  const getEventsForDate = React.useCallback((date: Date, typeFilter = eventTypeFilter, query = searchQuery) => {
    const searchLower = query.trim().toLowerCase();

    let matchedActs: ActivationEvent[] = [];
    if (typeFilter === "all" || typeFilter === "activation") {
      matchedActs = activations.filter(act => {
        if (!isActivationOnDate(act, date)) return false;
        if (!searchLower) return true;
        const matchesName = act.name.toLowerCase().includes(searchLower);
        const matchesLoc = act.location.toLowerCase().includes(searchLower);
        const matchesPeople = act.participants.some(p => p.toLowerCase().includes(searchLower));
        return matchesName || matchesLoc || matchesPeople;
      });
    }

    let matchedSchedules: PromoterScheduleEvent[] = [];
    if (typeFilter === "all" || typeFilter === "promoter") {
      matchedSchedules = schedules.filter(sch => {
        if (!isScheduleOnDate(sch, date)) return false;
        if (!searchLower) return true;
        const matchesCamp = sch.campaign_title.toLowerCase().includes(searchLower);
        const matchesStore = (sch.store_name + " " + sch.store_address).toLowerCase().includes(searchLower);
        const matchesPromoter = sch.promoter_name.toLowerCase().includes(searchLower);
        return matchesCamp || matchesStore || matchesPromoter;
      });
    }

    // Build unified calendar items
    const unifiedItems: UnifiedCalendarItem[] = [];

    // Add Activations
    matchedActs.forEach(act => {
      const dateYMD = formatDateToYMD(date);
      const daySchedule = Array.isArray(act.daily_schedule)
        ? act.daily_schedule.find(d => d.date === dateYMD)
        : null;

      let timeStr = "All Day";
      let startMin = 0;

      if (daySchedule && daySchedule.start_time) {
        timeStr = daySchedule.end_time ? `${daySchedule.start_time} - ${daySchedule.end_time}` : daySchedule.start_time;
        startMin = parseTimeToMinutes(daySchedule.start_time);
      } else if (act.start_time) {
        timeStr = act.end_time ? `${act.start_time} - ${act.end_time}` : act.start_time;
        startMin = parseTimeToMinutes(act.start_time);
      }

      unifiedItems.push({
        id: act.id,
        type: "activation",
        title: act.name,
        location: act.location,
        who: act.participants.join(", "),
        timeDisplay: timeStr,
        startMinutes: startMin,
        status: act.status,
        raw: act
      });
    });

    // Add Promoter Shifts
    matchedSchedules.forEach(sch => {
      const startT = sch.start_time || (sch as any).shift_start || (sch as any).Shift_Start || "";
      const endT = sch.end_time || (sch as any).shift_end || (sch as any).Shift_End || "";

      let timeStr = "Full Day";
      if (startT && endT) {
        timeStr = `${startT} - ${endT}`;
      } else if (startT) {
        timeStr = startT;
      }

      const startMin = parseTimeToMinutes(startT);

      unifiedItems.push({
        id: sch.id,
        type: "promoter",
        title: sch.campaign_title,
        location: sch.store_name,
        who: sch.promoter_name,
        timeDisplay: timeStr,
        startMinutes: startMin,
        status: sch.status,
        raw: sch
      });
    });

    // Sort chronologically by startMinutes, then by title
    unifiedItems.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }
      return a.title.localeCompare(b.title);
    });

    return {
      activations: matchedActs,
      schedules: matchedSchedules,
      allEventsSorted: unifiedItems,
      total: unifiedItems.length
    };
  }, [activations, schedules, eventTypeFilter, searchQuery]);

  const today = new Date();

  // Handle printing
  const handleTriggerPrint = () => {
    window.print();
  };

  // Print month navigation
  const printDateObj = new Date(printYear, printMonth, 1);
  const printDaysInMonth = new Date(printYear, printMonth + 1, 0).getDate();
  const printStartingDayIndex = (printDateObj.getDay() + 6) % 7;

  const printCalendarCells = React.useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    const prevMonthLastDay = new Date(printYear, printMonth, 0).getDate();

    for (let i = printStartingDayIndex - 1; i >= 0; i--) {
      cells.push({
        date: new Date(printYear, printMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    for (let d = 1; d <= printDaysInMonth; d++) {
      cells.push({
        date: new Date(printYear, printMonth, d),
        isCurrentMonth: true
      });
    }

    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let n = 1; n <= remaining; n++) {
      cells.push({
        date: new Date(printYear, printMonth + 1, n),
        isCurrentMonth: false
      });
    }

    return cells;
  }, [printYear, printMonth, printStartingDayIndex, printDaysInMonth]);

  // Aggregate Agenda items for print month
  const printAgendaList = React.useMemo(() => {
    const list: { date: Date; allEvents: UnifiedCalendarItem[] }[] = [];
    for (let d = 1; d <= printDaysInMonth; d++) {
      const curDate = new Date(printYear, printMonth, d);
      const events = getEventsForDate(curDate, printTypeFilter, "");
      if (events.total > 0) {
        list.push({
          date: curDate,
          allEvents: events.allEventsSorted
        });
      }
    }
    return list;
  }, [printYear, printMonth, printDaysInMonth, printTypeFilter, getEventsForDate]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* TopBar Navigation Tabs */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(id) => setActiveTab(id)}
      />

      {/* Single Unified Top Header Bar */}
      <div className="relative px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 print:hidden bg-white min-h-[44px]">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 z-10">
          {activeTab === "calendar" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setEventTypeFilter("all")}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full font-medium transition-all shrink-0",
                  eventTypeFilter === "all"
                    ? "bg-[#0B57D0] text-white shadow-xs"
                    : "bg-slate-50 text-zinc-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                All
              </button>
              <button
                onClick={() => setEventTypeFilter("activation")}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full font-medium transition-all shrink-0 flex items-center gap-1.5",
                  eventTypeFilter === "activation"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 text-zinc-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Activations
              </button>
              <button
                onClick={() => setEventTypeFilter("promoter")}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full font-medium transition-all shrink-0 flex items-center gap-1.5",
                  eventTypeFilter === "promoter"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 text-zinc-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Promoters
              </button>
            </div>
          )}
        </div>

        {/* Center: Month Navigation Capsule Slider (True Dead Center) */}
        {activeTab === "calendar" && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-slate-50 border border-slate-200 rounded-full px-1 py-0.5 shadow-2xs z-10">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-white transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="px-3 py-0.5 text-xs font-bold text-zinc-900 tracking-wide select-none min-w-[135px] text-center">
              {MONTH_NAMES[month]} {year}
            </div>

            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-white transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Right: Search & Action Buttons */}
        <div className="flex items-center gap-2 ml-auto z-10">
          {activeTab === "calendar" && (
            <div className="relative w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, location, staff..."
                className="w-full h-7 pl-7 pr-6 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {activeTab === "print" && (
            <button
              onClick={handleTriggerPrint}
              className="h-7 px-3 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={12} />
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === "calendar" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Calendar Grid Container */}
          <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden select-none">
            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div
                  key={day}
                  className={cn(
                    "py-2 text-center text-[11px] font-bold uppercase tracking-wider border-r border-slate-200 last:border-r-0",
                    idx >= 5 ? "text-blue-700 bg-blue-50/40" : "text-zinc-600"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto bg-white">
              {calendarCells.map((cell, idx) => {
                const isTodayCell = isSameDay(cell.date, today);
                const dayEvents = getEventsForDate(cell.date);
                const hasEvents = dayEvents.total > 0;
                const isRightCol = (idx + 1) % 7 === 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setExpandedDate(cell.date)}
                    className={cn(
                      "group relative flex flex-col p-1.5 min-h-[105px] overflow-hidden cursor-pointer transition-colors duration-150 hover:bg-blue-50/40 border-b border-slate-200",
                      !isRightCol && "border-r border-slate-200",
                      !cell.isCurrentMonth && "bg-[#F8F9FA]/70 opacity-60 text-zinc-400",
                      isTodayCell && "bg-blue-50/30"
                    )}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between mb-1 shrink-0">
                      <span
                        className={cn(
                          "w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full",
                          isTodayCell
                            ? "bg-[#0B57D0] text-white shadow-xs font-bold"
                            : cell.isCurrentMonth
                            ? "text-zinc-800"
                            : "text-zinc-400"
                        )}
                      >
                        {cell.date.getDate()}
                      </span>

                      {hasEvents && (
                        <span className="text-[10px] font-medium text-zinc-500 px-1.5 py-0.2 bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-700 rounded-full transition-colors">
                          {dayEvents.total} event{dayEvents.total > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Chronologically Sorted Event Cards Preview */}
                    <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto pr-0.5 scrollbar-thin">
                      {dayEvents.allEventsSorted.slice(0, 3).map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className={cn(
                            "px-1.5 py-1 rounded text-[10.5px] leading-tight shadow-xs transition-colors",
                            item.type === "activation"
                              ? "bg-emerald-50 border border-emerald-200/80 text-emerald-900 hover:border-emerald-400"
                              : "bg-indigo-50 border border-indigo-200/80 text-indigo-900 hover:border-indigo-400"
                          )}
                        >
                          {/* Title & Time Badge Header */}
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="font-bold truncate flex items-center gap-1 text-zinc-950">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  item.type === "activation" ? "bg-emerald-500" : "bg-indigo-500"
                                )}
                              />
                              <span className="truncate">{item.title}</span>
                            </div>

                            <span
                              className={cn(
                                "text-[9px] font-semibold px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5",
                                item.type === "activation"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-indigo-100 text-indigo-800"
                              )}
                            >
                              <Clock size={8} className="shrink-0" />
                              {item.timeDisplay}
                            </span>
                          </div>

                          {/* Location */}
                          <div
                            className={cn(
                              "text-[9.5px] truncate flex items-center gap-0.5",
                              item.type === "activation" ? "text-emerald-700" : "text-indigo-700"
                            )}
                          >
                            <MapPin size={9} className="shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>

                          {/* Who is involved */}
                          {item.who && (
                            <div
                              className={cn(
                                "text-[9px] truncate flex items-center gap-0.5 mt-0.5",
                                item.type === "activation" ? "text-emerald-600" : "text-indigo-600"
                              )}
                            >
                              <Users size={9} className="shrink-0" />
                              <span className="truncate">{item.who}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* More items indicator */}
                      {dayEvents.total > 3 && (
                        <div className="text-[10px] font-semibold text-blue-600 text-center py-0.5 bg-blue-50/60 hover:bg-blue-100 rounded transition-colors">
                          +{dayEvents.total - 3} more
                        </div>
                      )}
                    </div>

                    {/* Expand Hover Hint */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-zinc-400 hover:text-blue-600">
                      <Maximize2 size={11} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRINT VIEW */}
      {activeTab === "print" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 bg-[#F8F9FA]">
          {/* Print Options Card (Hidden in Print output) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              {/* Layout Mode */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Print Format
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    onClick={() => setPrintLayout("calendar")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-all",
                      printLayout === "calendar" ? "bg-white text-zinc-900 shadow-xs font-semibold" : "text-zinc-600 hover:text-zinc-900"
                    )}
                  >
                    Calendar Grid
                  </button>
                  <button
                    onClick={() => setPrintLayout("agenda")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-all",
                      printLayout === "agenda" ? "bg-white text-zinc-900 shadow-xs font-semibold" : "text-zinc-600 hover:text-zinc-900"
                    )}
                  >
                    Detailed Agenda List
                  </button>
                </div>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Month
                </label>
                <select
                  value={printMonth}
                  onChange={(e) => setPrintMonth(Number(e.target.value))}
                  className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 font-medium"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Year
                </label>
                <select
                  value={printYear}
                  onChange={(e) => setPrintYear(Number(e.target.value))}
                  className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 font-medium"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Event Type Filter */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Events Included
                </label>
                <select
                  value={printTypeFilter}
                  onChange={(e) => setPrintTypeFilter(e.target.value as any)}
                  className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 font-medium"
                >
                  <option value="all">All Events (Activations & Promoters)</option>
                  <option value="activation">Activations Only</option>
                  <option value="promoter">Promoter Shifts Only</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleTriggerPrint}
              className="h-9 px-4 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Printer size={14} />
              Print Calendar
            </button>
          </div>

          {/* Printable Document Canvas */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
            {/* Print Header */}
            <div className="border-b-2 border-zinc-900 pb-3 mb-4 flex items-center justify-between">
              <div>
                <div className="text-xl font-black tracking-tight text-zinc-950 uppercase">
                  iB - HSG Global Internal Bridge
                </div>
                <div className="text-xs font-semibold text-zinc-600">
                  Master Frontline Events & Deployment Schedule
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-[#0B57D0]">
                  {MONTH_NAMES[printMonth]} {printYear}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Generated on {new Date().toLocaleDateString("en-GB")}
                </div>
              </div>
            </div>

            {/* Print Format 1: Grid Layout */}
            {printLayout === "calendar" && (
              <div className="border border-zinc-300 rounded overflow-hidden">
                <div className="grid grid-cols-7 bg-zinc-100 border-b border-zinc-300 text-center text-xs font-bold text-zinc-800 py-1.5 uppercase">
                  {DAYS_OF_WEEK.map(d => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 text-xs">
                  {printCalendarCells.map((cell, idx) => {
                    const dayEvents = getEventsForDate(cell.date, printTypeFilter, "");
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "min-h-[110px] p-1.5 flex flex-col",
                          !cell.isCurrentMonth && "bg-zinc-50 text-zinc-400"
                        )}
                      >
                        <div className="font-bold text-xs mb-1 text-zinc-900">
                          {cell.date.getDate()}
                        </div>

                        <div className="space-y-1 flex-1">
                          {dayEvents.allEventsSorted.map((item) => (
                            <div
                              key={`${item.type}-${item.id}`}
                              className={cn(
                                "p-1 rounded border text-[10px] leading-tight",
                                item.type === "activation"
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                                  : "bg-indigo-50 border-indigo-300 text-indigo-950"
                              )}
                            >
                              <div className="font-bold flex items-center justify-between">
                                <span>[{item.type === "activation" ? "Act" : "Promoter"}] {item.title}</span>
                                <span className="text-[8.5px] font-normal opacity-80">{item.timeDisplay}</span>
                              </div>
                              <div className="text-[9px] text-zinc-700">{item.location}</div>
                              {item.who && (
                                <div className="text-[8.5px] text-zinc-500">Who: {item.who}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Print Format 2: Agenda List Layout */}
            {printLayout === "agenda" && (
              <div className="space-y-4">
                {printAgendaList.length === 0 ? (
                  <div className="text-center py-10 text-sm text-zinc-500 italic">
                    No scheduled activations or promoter shifts found for {MONTH_NAMES[printMonth]} {printYear}.
                  </div>
                ) : (
                  printAgendaList.map((item, idx) => (
                    <div key={idx} className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
                      <div className="text-xs font-bold text-zinc-900 mb-2 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                        <CalendarIcon size={13} className="text-[#0B57D0]" />
                        <span>
                          {item.date.toLocaleDateString("en-GB", { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] font-normal text-zinc-500">
                          ({item.allEvents.length} scheduled)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {item.allEvents.map((ev) => (
                          <div
                            key={`${ev.type}-${ev.id}`}
                            className={cn(
                              "p-2.5 rounded-md bg-white border shadow-2xs",
                              ev.type === "activation" ? "border-emerald-200" : "border-indigo-200"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                  ev.type === "activation"
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                    : "text-indigo-700 bg-indigo-50 border-indigo-200"
                                )}
                              >
                                {ev.type === "activation" ? "Activation Event" : "Promoter Shift"}
                              </span>
                              <span className="text-[10px] text-zinc-600 font-semibold flex items-center gap-1">
                                <Clock size={10} />
                                {ev.timeDisplay}
                              </span>
                            </div>

                            <div className="font-bold text-zinc-900 text-sm">{ev.title}</div>
                            <div className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
                              <MapPin size={11} className="text-zinc-400 shrink-0" />
                              <span>{ev.location}</span>
                            </div>
                            {ev.who && (
                              <div className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                                <Users size={11} className="text-zinc-400 shrink-0" />
                                <span>Involved: {ev.who}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GROW-UP CELL MODAL / DETAIL DRAWER */}
      {expandedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden font-primary animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0B57D0]/10 text-[#0B57D0] flex items-center justify-center">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950">
                    {expandedDate.toLocaleDateString("en-GB", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Detailed chronological schedule breakdown for this date.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setExpandedDate(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 min-h-0 overflow-y-auto space-y-4">
              {(() => {
                const events = getEventsForDate(expandedDate);
                if (events.total === 0) {
                  return (
                    <div className="text-center py-12 text-zinc-500">
                      <CalendarIcon size={36} className="mx-auto text-zinc-300 mb-2" />
                      <p className="text-sm font-medium">No events scheduled for this day.</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Activations and promoter shifts will show here.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                        Events Timeline ({events.total})
                      </span>
                      <span className="text-xs text-zinc-400">
                        Sorted by scheduled start time
                      </span>
                    </div>

                    {events.allEventsSorted.map((item) => {
                      const isAct = item.type === "activation";
                      const act = isAct ? (item.raw as ActivationEvent) : null;
                      const sch = !isAct ? (item.raw as PromoterScheduleEvent) : null;

                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          className={cn(
                            "p-4 rounded-lg border transition-colors",
                            isAct
                              ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70"
                              : "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                                    isAct ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
                                  )}
                                >
                                  {isAct ? "Activation Event" : "Promoter Shift"}
                                </span>

                                <span
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                                    item.status === "active" || item.status === "completed"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-zinc-600"
                                  )}
                                >
                                  {item.status}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-zinc-950">
                                {item.title}
                              </h4>
                            </div>

                            {/* Prominent Time Display */}
                            <div className="px-2.5 py-1 bg-white rounded-md border border-slate-200 text-xs font-bold text-zinc-800 flex items-center gap-1.5 shadow-2xs shrink-0">
                              <Clock size={13} className={isAct ? "text-emerald-600" : "text-indigo-600"} />
                              <span>{item.timeDisplay}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 mt-2">
                            <div className="flex items-center gap-1.5">
                              {isAct ? (
                                <MapPin size={13} className="text-emerald-600 shrink-0" />
                              ) : (
                                <Building2 size={13} className="text-indigo-600 shrink-0" />
                              )}
                              <span><strong>Location:</strong> {item.location}</span>
                            </div>

                            {isAct && act && (
                              <div className="flex items-center gap-1.5">
                                <Clock size={13} className="text-emerald-600 shrink-0" />
                                <span>
                                  <strong>Date Span:</strong> {act.start_date === act.end_date ? act.start_date : `${act.start_date} to ${act.end_date}`}
                                </span>
                              </div>
                            )}

                            {sch && sch.store_address && (
                              <div className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-indigo-600 shrink-0" />
                                <span><strong>Address:</strong> {sch.store_address}</span>
                              </div>
                            )}
                          </div>

                          {/* Participants / Promoter Info */}
                          {item.who && (
                            <div
                              className={cn(
                                "mt-2.5 pt-2 border-t flex items-start gap-1.5 text-xs text-zinc-700",
                                isAct ? "border-emerald-200/60" : "border-indigo-200/60"
                              )}
                            >
                              <Users size={13} className={isAct ? "text-emerald-600" : "text-indigo-600"} />
                              <div>
                                <strong>{isAct ? "Staff Involved:" : "Assigned Promoter:"}</strong>{" "}
                                <span>{item.who}</span>
                              </div>
                            </div>
                          )}

                          {act?.foc_description && (
                            <div className="mt-2 text-xs text-zinc-500 italic">
                              Note: {act.foc_description}
                            </div>
                          )}

                          {sch?.tasks && (
                            <div className="mt-2 text-xs text-zinc-500 italic">
                              Tasks: {sch.tasks}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setExpandedDate(null)}
                className="h-8 px-4 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
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
