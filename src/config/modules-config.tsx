export interface SubModuleConfig {
  title: string;
  description: string;
}

export interface PageConfig {
  id: string;
  label: string;
  modules: SubModuleConfig[];
}

export const APP_PAGES_CONFIG: PageConfig[] = [
  {
    id: "Dashboard",
    label: "Dashboard",
    modules: []
  },
  {
    id: "Frontline",
    label: "Frontline",
    modules: [
      {
        title: "Promoter",
        description: "Manage promoter schedules, performance tracking, sales reporting, and location check-ins.",
      },
      {
        title: "Merchandiser",
        description: "Monitor store layout compliance, shelf visibility audits, stock level reports, and visual displays.",
      },
      {
        title: "Task",
        description: "Assign, monitor, and update field tasks for Merchandisers, Call Center, Drivers, and other staff.",
      },
      {
        title: "Track Order",
        description: "Monitor and manage delivery orders, vehicle routing tracks, and real-time delivery logs.",
      }
    ]
  },
  {
    id: "Database",
    label: "Database",
    modules: [
      {
        title: "Products Database",
        description: "Manage core item catalogs, inventory logs, prices, variants, and vendor details.",
      },
      {
        title: "Stores Database",
        description: "Track physical outlet registries, contact logs, active hours, and terminal statuses.",
      },
      {
        title: "Retailer SKU's",
        description: "Manage retailer-specific product catalogs, pricing tiers, and active status mappings."
      }
    ]
  },
  {
    id: "Sales & Channels",
    label: "Sales & Channels",
    modules: [
      {
        title: "Multi-Channel Sync",
        description: "Synchronize inventory, pricing, and orders across e-commerce platforms and physical retail.",
      },
      {
        title: "Sales Leaderboard",
        description: "Track performance rankings, daily achievements, and leaderboard statistics for field sales.",
      },
      {
        title: "Promo & Pricing Rules",
        description: "Define pricing strategies, seasonal discount triggers, dynamic promo rules, and margins.",
      },
      {
        title: "Snap Deals",
        description: "Configure instant flash promotions, short-duration sales campaigns, and real-time deal triggers.",
      },
      {
        title: "Stores Visibility",
        description: "Monitor product retail presence, store visibility, latest visits, and shelf compliance audits.",
      },
      {
        title: "Sponsorship",
        description: "Manage brand sponsorships, output distribution tracking, and receiver limit registries.",
      }
    ]
  },
  {
    id: "Office Tools",
    label: "Office Tools",
    modules: [
      {
        title: "Invoice Barcode Generator",
        description: "Generate GS1-compliant barcodes for inventory mapping, shipping documents, and billing records.",
      },
      {
        title: "Claim Form Generator",
        description: "Quickly format field claims, expense files, promoter commissions, and merchandise audits.",
      },
      {
        title: "Delivery Label Generator",
        description: "Produce standards-compliant shipping labels with routing barcodes, return details, and weights.",
      }
    ]
  },
  {
    id: "Marketing & Content",
    label: "Marketing & Content",
    modules: [
      {
        title: "Asset Library",
        description: "Manage digital brand assets, product photo archives, campaign banners, and guidelines.",
      },
      {
        title: "TikTok & Storyboard Briefs",
        description: "Draft, edit, and organize storyboard briefs, video templates, and creators' guidelines.",
      },
      {
        title: "Marketing Calendar",
        description: "Plan promotional launches, influencer schedules, content releases, and pipeline dates.",
      }
    ]
  },
  {
    id: "Administrator",
    label: "Administrator",
    modules: [
      {
        title: "Users",
        description: "Manage system credentials, approve registrations, assign security roles, and define user accesses.",
      },
      {
        title: "Setting",
        description: "Configure system settings, parameters, and secure API integration keys.",
      }
    ]
  }
];
