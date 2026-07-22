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
import { AdministratorPage } from "@/components/pages/administrator";

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
    id: "Administrator",
    label: "Administrator",
    icon: <Shield size={18} />,
    component: <AdministratorPage />,
  },
];
