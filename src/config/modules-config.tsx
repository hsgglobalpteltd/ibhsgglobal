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
        description: "Manage promoter schedules, campaigns, attendance, and activity assignments.",
      },
      {
        title: "Merchandiser",
        description: "Manage merchandiser routes, tasks, deployment settings, reports, and performance monitoring.",
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
        description: "Manage brands, SKUs, pricing, variants, product details, and catalogs.",
      },
      {
        title: "Stores Database",
        description: "Manage retailers, store registrations, locations, and contact information.",
      },
      {
        title: "Retailer SKU's",
        description: "Manage retailer pricing tiers, promotions, product listings, and registrations."
      },
      {
        title: "Phonebook",
        description: "Manage contact directories, affiliations, and phone communications registry."
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
        description: "Calculate deal costs, pricing, profits, and retailer business agreements.",
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
    id: "Stock",
    label: "Stock",
    modules: [
      {
        title: "Inventory",
        description: "Monitor and manage stock take logs, stock levels, and inventory adjustments.",
      },
      {
        title: "Dispose Record",
        description: "Manage and record damaged, returned, or expired goods disposal (coming soon).",
      }
    ]
  },
  {
    id: "Office Tools",
    label: "Office Tools",
    modules: [
      {
        title: "Invoice Barcode Generator",
        description: "Generate invoice barcodes for retailers requiring barcode-enabled invoices.",
      },
      {
        title: "Claim Form Generator",
        description: "Upload receipts, scan data, and generate printable claim forms instantly.",
      },
      {
        title: "Delivery Label Generator",
        description: "Generate editable A6 delivery labels for quick printing and dispatch.",
      }
    ]
  },
  {
    id: "Marketing & Content",
    label: "Marketing & Content",
    modules: [
      {
        title: "Asset Library",
        description: "Store, organize, and manage photos, documents, and marketing assets securely.",
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
