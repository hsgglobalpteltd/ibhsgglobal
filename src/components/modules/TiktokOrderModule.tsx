"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Store } from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";
import { TiktokOrdersModule } from "./TiktokOrdersModule";
import { TiktokProductsModule } from "./TiktokProductsModule";
import { TiktokSalesReportModule } from "./TiktokSalesReportModule";
import { TiktokTerminalModule } from "./TiktokTerminalModule";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface TiktokOrderModuleProps {
  profile?: any;
}

interface Shop {
  id: string;
  name: string;
}

export function TiktokOrderModule({ profile }: TiktokOrderModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"orders" | "products" | "report" | "terminal">("orders");
  const [selectedShopId, setSelectedShopId] = React.useState<string>("all");
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const [topbarSlot, setTopbarSlot] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setTopbarSlot(document.getElementById("topbar-center-slot"));

    // Fetch authorized shops list
    fetch(`${WORKER_URL}/api/tiktok/shops`)
      .then((r) => r.json())
      .then((data) => {
        if (data.shops && Array.isArray(data.shops)) {
          setShops(data.shops);
        }
      })
      .catch((err) => console.error("Failed to load TikTok shops:", err));
  }, []);

  const tabs = React.useMemo(
    () => [
      { id: "orders", label: "Orders" },
      { id: "products", label: "Products" },
      { id: "report", label: "Report" },
      { id: "terminal", label: "Terminal" },
    ],
    []
  );

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden min-h-0 min-w-0 font-primary">
      {/* TopBar Navigation Tabs */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(id) => setActiveTab(id as "orders" | "products" | "report" | "terminal")}
      />

      {/* TopBar Center Shop Selector (Hidden on Terminal tab) */}
      {mounted && topbarSlot && activeTab !== "terminal" && createPortal(
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 shadow-2xs">
          <Store size={14} className="text-zinc-500 shrink-0" />
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-zinc-800 outline-none cursor-pointer max-w-[220px] truncate"
          >
            <option value="all">All TikTok Shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>,
        topbarSlot
      )}

      {/* Active Tab Panel */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "orders" && (
          <TiktokOrdersModule
            profile={profile}
            selectedShopId={selectedShopId}
            onSelectShopId={setSelectedShopId}
          />
        )}
        {activeTab === "products" && (
          <TiktokProductsModule
            profile={profile}
            selectedShopId={selectedShopId}
            onSelectShopId={setSelectedShopId}
          />
        )}
        {activeTab === "report" && (
          <TiktokSalesReportModule
            profile={profile}
            selectedShopId={selectedShopId}
            onSelectShopId={setSelectedShopId}
          />
        )}
        {activeTab === "terminal" && <TiktokTerminalModule profile={profile} />}
      </div>
    </div>
  );
}
