"use client";

import * as React from "react";
import { NavigationTabs } from "../navigation-tabs";
import { TiktokOrdersModule } from "./TiktokOrdersModule";
import { TiktokSalesReportModule } from "./TiktokSalesReportModule";
import { TiktokTerminalModule } from "./TiktokTerminalModule";

interface TiktokOrderModuleProps {
  profile?: any;
}

export function TiktokOrderModule({ profile }: TiktokOrderModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"orders" | "report" | "terminal">("orders");

  const tabs = React.useMemo(
    () => [
      { id: "orders", label: "Orders" },
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
        onTabSelect={(id) => setActiveTab(id as "orders" | "report" | "terminal")}
      />

      {/* Active Tab Panel */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "orders" && <TiktokOrdersModule profile={profile} />}
        {activeTab === "report" && <TiktokSalesReportModule profile={profile} />}
        {activeTab === "terminal" && <TiktokTerminalModule profile={profile} />}
      </div>
    </div>
  );
}
