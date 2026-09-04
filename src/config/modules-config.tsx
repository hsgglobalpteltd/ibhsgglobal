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
      },
      {
        title: "Employees",
        description: "Manage employee profiles, credentials, contact information, and application access roles."
      }
    ]
  },
  {
    id: "Sales & Channels",
    label: "Sales & Channels",
    modules: [
      {
        title: "Direct Order",
        description: "Manage public retailer direct orders, print order PDFs, complete orders, and update details.",
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
      },
      {
        title: "Manage POS",
        description: "Configure POS catalog pricing, allocate retail stock, and review cashier transactions.",
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
        title: "Manage Stock",
        description: "Audit, edit, and batch-combine stock movements with Million reference numbers, custom dates, and verification status.",
      },
      {
        title: "Stock Card",
        description: "Analyze stock in, stock out, transfers, DO deliveries, and returns by weekly or custom cycles.",
      },
      {
        title: "Dispose Record",
        description: "Manage and record damaged, returned, or expired goods disposal.",
      },
      {
        title: "Print Manager",
        description: "Generate and export custom print templates and warehouse documents as PDF.",
      }
    ]
  },
  {
    id: "Office Tools",
    label: "Office Tools",
    modules: [
      {
        title: "Staff Claims",
        description: "Record on-the-go out-of-pocket expenses, attach receipts, and submit batches up to $100 for payout.",
      },
      {
        title: "Finance Claims",
        description: "Review staff approvals, pay via PayNow, and compile official 2-page claim reports for Finance.",
      },
      {
        title: "Invoice Barcode Generator",
        description: "Generate invoice barcodes for retailers requiring barcode-enabled invoices.",
      },
      {
        title: "Delivery Label Generator",
        description: "Generate editable A6 delivery labels for quick printing and dispatch.",
      },
      {
        title: "Asset Library",
        description: "Store, organize, and manage photos, documents, and marketing assets securely.",
      }
    ]
  },
  {
    id: "Website",
    label: "Website",
    modules: [
      {
        title: "Site",
        description: "Create website folders and allocate them to approved portal users (supports multi-user binding).",
      },
      {
        title: "Portal Users",
        description: "Manage registered user portals. Approve, suspend, or remove portal workspace access.",
      },
      {
        title: "Catalog Web",
        description: "Manage export catalog website layout, headlines, products & brands showcase, AI customer service concierge, assets, and inquiry routing.",
      }
    ]
  },
  {
    id: "Tiktok",
    label: "Tiktok",
    modules: [
      {
        title: "Tiktok Orders",
        description: "Monitor and manage TikTok shop orders, AWB generation, print queues, and status synchronizations.",
      },
      {
        title: "Tiktok Terminal",
        description: "Manage Tiktok fulfillment terminals, IP verification configurations, and station permissions.",
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
