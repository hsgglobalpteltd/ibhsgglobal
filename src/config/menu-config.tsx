import * as React from "react";
import { LayoutDashboard, Users, Database, TrendingUp, Package, Briefcase, Megaphone, Shield, Globe } from "lucide-react";
import { DashboardPage } from "@/components/pages/dashboard";
import { FrontlinePage } from "@/components/pages/frontline";
import { DatabasePage } from "@/components/pages/database";
import { SalesChannelsPage } from "@/components/pages/sales-channels";
import { StockPage } from "@/components/pages/stock";
import { OfficeToolsPage } from "@/components/pages/office-tools";
import { MarketingContentPage } from "@/components/pages/marketing-content";
import { WebsitePage } from "@/components/pages/website";
import { TiktokPage } from "@/components/pages/tiktok";
import { AdministratorPage } from "@/components/pages/administrator";

export function TiktokIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46 6.27 6.27 0 0 0 1.88-4.47V8.41a8.2 8.2 0 0 0 5.06 1.74v-3.46h-.01a4.84 4.84 0 0 1-1.2-.001z" />
    </svg>
  );
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export const menuConfig: MenuItem[] = [
  {
    id: "Dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    component: <DashboardPage />,
  },
  {
    id: "Frontline",
    label: "Frontline",
    icon: <Users size={18} />,
    component: <FrontlinePage />,
  },
  {
    id: "Database",
    label: "Database",
    icon: <Database size={18} />,
    component: <DatabasePage />,
  },
  {
    id: "Sales & Channels",
    label: "Sales & Channels",
    icon: <TrendingUp size={18} />,
    component: <SalesChannelsPage />,
  },
  {
    id: "Stock",
    label: "Stock",
    icon: <Package size={18} />,
    component: <StockPage />,
  },
  {
    id: "Office Tools",
    label: "Office Tools",
    icon: <Briefcase size={18} />,
    component: <OfficeToolsPage />,
  },
  {
    id: "Marketing & Content",
    label: "Marketing & Content",
    icon: <Megaphone size={18} />,
    component: <MarketingContentPage />,
  },
  {
    id: "Website",
    label: "Website",
    icon: <Globe size={18} />,
    component: <WebsitePage />,
  },
  {
    id: "Tiktok",
    label: "Tiktok",
    icon: <TiktokIcon size={18} />,
    component: <TiktokPage />,
  },
  {
    id: "Administrator",
    label: "Administrator",
    icon: <Shield size={18} />,
    component: <AdministratorPage />,
  },
];
