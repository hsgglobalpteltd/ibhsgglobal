"use client";

import * as React from "react";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Calendar, 
  DollarSign, 
  Store, 
  Layers, 
  ArrowRight, 
  FileText,
  Clock,
  TrendingUp,
  Percent,
  RefreshCw
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface SkuItem {
  sku_id: string;
  sku_name: string;
  qty: number;
  unit_price: number; // Buyer Cost ($)
  cost_price: number; // Our Cost ($)
}

interface OrderStage {
  title: string;
  estimated_order_date: string;
  expected_cash_date: string;
  sku_items: SkuItem[];
}

interface CostEntity {
  entity_name: string;
  percentage: number;
  amount: number;
}

interface CostItem {
  cost_title: string;
  total_cost: number;
  share_entities: CostEntity[];
  net_cost_we_pay: number;
}

interface ProjectionData {
  id?: string;
  title: string;
  retailer_id: string;
  retailer_name: string;
  store_count_mode: "all" | "custom";
  store_count: number;
  payment_terms: string;
  orders: OrderStage[];
  costs: CostItem[];
  total_projected_revenue: number;
  total_projected_cost: number;
  total_listing_fees: number;
  net_listing_fees_we_pay: number;
  net_projected_profit: number;
  status: "draft" | "active" | "archived";
}

interface SaleProjectionModuleProps {
  profile?: any;
}

export function SaleProjectionModule({ profile }: SaleProjectionModuleProps) {
  const [projections, setProjections] = React.useState<ProjectionData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [editingProjection, setEditingProjection] = React.useState<ProjectionData | null>(null);
  const [showEditor, setShowEditor] = React.useState<boolean>(false);

  // Available Retailers and Products from live Database
  const [retailersList, setRetailersList] = React.useState<any[]>([]);
  const [productsList, setProductsList] = React.useState<any[]>([]);

  // 1. Fetch Projections
  const fetchProjections = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales-projections`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjections(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast("Failed to load projections: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch reference metadata from backend
  const fetchMetadata = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sales-projections/metadata`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.retailers)) setRetailersList(data.retailers);
        if (Array.isArray(data.products)) setProductsList(data.products);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchProjections();
    fetchMetadata();
  }, [fetchProjections, fetchMetadata]);

  // Create new blank projection
  const handleCreateNew = () => {
    const blank: ProjectionData = {
      title: "New Retail Rollout",
      retailer_id: "",
      retailer_name: "",
      store_count_mode: "custom",
      store_count: 400,
      payment_terms: "60d",
      orders: [
        {
          title: "1st Order: Initial Pipeline Fill",
          estimated_order_date: new Date().toISOString().slice(0, 10),
          expected_cash_date: "",
          sku_items: [
            {
              sku_id: "",
              sku_name: "",
              qty: 12000,
              unit_price: 0,
              cost_price: 0
            }
          ]
        }
      ],
      costs: [
        {
          cost_title: "Listing & Slotting Fee",
          total_cost: 10000,
          share_entities: [],
          net_cost_we_pay: 10000
        }
      ],
      total_projected_revenue: 0,
      total_projected_cost: 0,
      total_listing_fees: 0,
      net_listing_fees_we_pay: 0,
      net_projected_profit: 0,
      status: "active"
    };
    recalculateProjection(blank);
    setEditingProjection(blank);
    setShowEditor(true);
  };

  // Recalculate financial totals
  const recalculateProjection = (proj: ProjectionData) => {
    let totalRev = 0;
    let totalCost = 0;

    const paymentDays = parseInt((proj.payment_terms || "30d").replace(/\D/g, ""), 10) || 30;

    // Recalculate orders
    proj.orders.forEach((ord) => {
      if (ord.estimated_order_date) {
        const est = new Date(ord.estimated_order_date).getTime();
        ord.expected_cash_date = new Date(est + paymentDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      }
      ord.sku_items.forEach((item) => {
        const q = Number(item.qty || 0);
        const u = Number(item.unit_price || 0); // Buyer Cost
        const c = Number(item.cost_price || 0); // Our Cost
        totalRev += q * u;
        totalCost += q * c;
      });
    });

    // Recalculate costs
    let totalListingFees = 0;
    let netListingWePay = 0;

    proj.costs.forEach((cost) => {
      const tot = Number(cost.total_cost || 0);
      totalListingFees += tot;

      const entities = cost.share_entities || [];
      let otherPctSum = 0;
      entities.forEach((ent) => {
        const pct = Number(ent.percentage || 0);
        otherPctSum += pct;
        ent.amount = (tot * pct) / 100;
      });

      const wePayPct = Math.max(0, 100 - otherPctSum);
      cost.net_cost_we_pay = (tot * wePayPct) / 100;
      netListingWePay += cost.net_cost_we_pay;
    });

    proj.total_projected_revenue = totalRev;
    proj.total_projected_cost = totalCost;
    proj.total_listing_fees = totalListingFees;
    proj.net_listing_fees_we_pay = netListingWePay;
    proj.net_projected_profit = totalRev - totalCost - netListingWePay;
  };

  // Handle SKU input & auto-fill from Products DB
  const handleSkuChange = (
    stageIdx: number,
    skuIdx: number,
    inputVal: string
  ) => {
    if (!editingProjection) return;
    const copy = { ...editingProjection };
    const item = copy.orders[stageIdx].sku_items[skuIdx];
    item.sku_id = inputVal;

    // Check if matched in productsList
    const matched = productsList.find(
      (p) =>
        String(p.sku || p.id || "").trim().toLowerCase() === inputVal.trim().toLowerCase() ||
        String(p.display_name || p.name || "").trim().toLowerCase() === inputVal.trim().toLowerCase()
    );

    if (matched) {
      item.sku_id = matched.sku || matched.id || inputVal;
      item.sku_name = matched.display_name || matched.name || item.sku_name;
      const ourCost = Number(matched.cost || matched.cost_price || 0);
      const buyerCost = Number(matched.wholesale_price || matched.rsp || 0);
      if (ourCost > 0) item.cost_price = ourCost;
      if (buyerCost > 0) item.unit_price = buyerCost;
    }

    recalculateProjection(copy);
    setEditingProjection({ ...copy });
  };

  // Save Projection to API
  const handleSaveProjection = async () => {
    if (!editingProjection) return;
    if (!editingProjection.title.trim()) {
      showToast("Please enter a projection title", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales-projections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProjection)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      showToast("Projection saved successfully!", "success");
      setShowEditor(false);
      setEditingProjection(null);
      await fetchProjections();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Confirm Dialog State
  const [confirmConfig, setConfirmConfig] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "danger" | "default" | "dark";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Delete Projection
  const handleDeleteProjection = (id?: string) => {
    if (!id) return;
    setConfirmConfig({
      open: true,
      title: "Delete Sale Projection",
      description: "Are you sure you want to delete this sale projection? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/sales-projections/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          showToast("Projection deleted", "success");
          await fetchProjections();
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 🏛️ Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Sale Projection & Planning</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure future product launches, estimated orders, SKU reorder projections, and shared listing fees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-lg shadow-xs active:scale-98 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Projection</span>
          </button>
        </div>
      </div>

      {/* 📋 Projections List View */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {projections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
            <TrendingUp className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-zinc-700">No commercial projections configured</p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Create a projection scenario to estimate orders, product demand, and cash inflow timing.
            </p>
            <button
              onClick={handleCreateNew}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white rounded-lg hover:bg-[#0842A0] shadow-xs"
            >
              + Create First Projection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projections.map((p) => {
              let ords = [];
              let costs = [];
              try { ords = typeof p.orders === "string" ? JSON.parse(p.orders) : p.orders || []; } catch {}
              try { costs = typeof p.costs === "string" ? JSON.parse(p.costs) : p.costs || []; } catch {}

              const rev = Number(p.total_projected_revenue || 0);
              const profit = Number(p.net_projected_profit || 0);
              const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {p.retailer_name || p.retailer_id || "General Rollout"}
                      </span>
                      <span className="text-[11px] text-zinc-500">{p.payment_terms || "30d"} terms</span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 mt-2">{p.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {p.store_count_mode === "all" ? "All registered stores" : `${p.store_count} stores`} • {ords.length} estimated orders
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-4 bg-[#F8F9FA] p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">Proj. Revenue</span>
                        <div className="font-bold text-zinc-900">${rev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">Net Profit ({margin}%)</span>
                        <div className="font-bold text-zinc-900">${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleDeleteProjection(p.id)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const copy: ProjectionData = {
                          ...p,
                          orders: ords,
                          costs: costs
                        };
                        recalculateProjection(copy);
                        setEditingProjection(copy);
                        setShowEditor(true);
                      }}
                      className="px-3 py-1 text-xs font-semibold bg-white border border-slate-300 text-zinc-700 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#0B57D0]" />
                      <span>Edit Projection</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✏️ Full Projection Editor Drawer / Modal */}
      {showEditor && editingProjection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 font-primary">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  {editingProjection.id ? "Edit Sales Projection" : "New Sales Projection"}
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Configure order volumes, product costs, payment terms, and co-shared listing fees.
                </p>
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* 1. Basic Projection Details (Flat Inline Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Projection Title</label>
                  <input
                    type="text"
                    value={editingProjection.title}
                    onChange={(e) => {
                      const copy = { ...editingProjection, title: e.target.value };
                      setEditingProjection(copy);
                    }}
                    className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                    placeholder="e.g. FairPrice Rollout"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Target Retailer</label>
                  <input
                    type="text"
                    list="retailers-datalist"
                    value={editingProjection.retailer_name}
                    onChange={(e) => {
                      const copy = { ...editingProjection, retailer_name: e.target.value, retailer_id: e.target.value };
                      setEditingProjection(copy);
                    }}
                    className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                    placeholder="Select Retailer..."
                  />
                  <datalist id="retailers-datalist">
                    {retailersList.map((r) => (
                      <option key={r.id} value={r.display_name || r.id} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Payment Terms</label>
                  <select
                    value={editingProjection.payment_terms}
                    onChange={(e) => {
                      const copy = { ...editingProjection, payment_terms: e.target.value };
                      recalculateProjection(copy);
                      setEditingProjection({ ...copy });
                    }}
                    className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                  >
                    <option value="30d">30 Days</option>
                    <option value="60d">60 Days</option>
                    <option value="90d">90 Days</option>
                    <option value="120d">120 Days</option>
                    <option value="150d">150 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Store Scope (Doors)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editingProjection.store_count}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10) || 0;
                        const copy = { ...editingProjection, store_count: count, store_count_mode: "custom" as const };
                        setEditingProjection(copy);
                      }}
                      className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                      placeholder="e.g. 400"
                    />
                  </div>
                </div>
              </div>

              {/* Datalist for autocomplete SKUs */}
              <datalist id="products-datalist">
                {productsList.map((p) => (
                  <option key={p.id || p.sku} value={p.sku}>
                    {p.display_name || p.name}
                  </option>
                ))}
              </datalist>

              {/* 2. Estimated Orders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-zinc-900">
                    Estimated Orders ({editingProjection.orders.length}/5)
                  </span>
                  {editingProjection.orders.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = { ...editingProjection };
                        copy.orders.push({
                          title: `Order ${copy.orders.length + 1}`,
                          estimated_order_date: new Date().toISOString().slice(0, 10),
                          expected_cash_date: "",
                          sku_items: [
                            {
                              sku_id: "",
                              sku_name: "",
                              qty: 6000,
                              unit_price: 0,
                              cost_price: 0
                            }
                          ]
                        });
                        recalculateProjection(copy);
                        setEditingProjection({ ...copy });
                      }}
                      className="text-xs font-semibold text-[#0B57D0] hover:text-[#0842A0] flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Order</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {editingProjection.orders.map((stage, stageIdx) => (
                    <div key={stageIdx} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      {/* Order Stage Header */}
                      <div className="px-3.5 py-2 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#0B57D0] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            #{stageIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={stage.title}
                            onChange={(e) => {
                              const copy = { ...editingProjection };
                              copy.orders[stageIdx].title = e.target.value;
                              setEditingProjection({ ...copy });
                            }}
                            className="font-semibold text-zinc-900 bg-transparent outline-none text-xs hover:border-b hover:border-slate-300 w-52"
                            placeholder="Order Title..."
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] text-zinc-600">
                            <span>Estimate Date Order:</span>
                            <input
                              type="date"
                              value={stage.estimated_order_date}
                              onChange={(e) => {
                                const copy = { ...editingProjection };
                                copy.orders[stageIdx].estimated_order_date = e.target.value;
                                recalculateProjection(copy);
                                setEditingProjection({ ...copy });
                              }}
                              className="h-6 px-1.5 border border-slate-200 rounded bg-white text-xs font-medium text-zinc-800"
                            />
                          </div>

                          {editingProjection.orders.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const copy = { ...editingProjection };
                                copy.orders.splice(stageIdx, 1);
                                recalculateProjection(copy);
                                setEditingProjection({ ...copy });
                              }}
                              className="text-zinc-400 hover:text-rose-600 p-0.5 rounded"
                              title="Remove Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SKU Table */}
                      <div className="p-3">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-[10px] text-zinc-500 font-bold uppercase border-b border-slate-100">
                              <th className="pb-1.5 w-32">SKU Code</th>
                              <th className="pb-1.5">Description</th>
                              <th className="pb-1.5 text-right w-20">Qty</th>
                              <th className="pb-1.5 text-right w-20">Our Cost ($)</th>
                              <th className="pb-1.5 text-right w-20">Buyer Cost ($)</th>
                              <th className="pb-1.5 text-right w-24">Total</th>
                              <th className="pb-1.5 w-6"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stage.sku_items.map((sku, skuIdx) => (
                              <tr key={skuIdx}>
                                <td className="py-1.5 pr-1.5">
                                  <input
                                    type="text"
                                    list="products-datalist"
                                    value={sku.sku_id}
                                    onChange={(e) => handleSkuChange(stageIdx, skuIdx, e.target.value)}
                                    className="h-7 px-2 border border-slate-200 rounded w-full text-xs font-mono bg-white focus:outline-none focus:border-[#0B57D0]"
                                    placeholder="SKU"
                                  />
                                </td>
                                <td className="py-1.5 pr-1.5">
                                  <input
                                    type="text"
                                    value={sku.sku_name}
                                    onChange={(e) => {
                                      const copy = { ...editingProjection };
                                      copy.orders[stageIdx].sku_items[skuIdx].sku_name = e.target.value;
                                      setEditingProjection({ ...copy });
                                    }}
                                    className="h-7 px-2 border border-slate-200 rounded w-full text-xs bg-white focus:outline-none focus:border-[#0B57D0]"
                                    placeholder="Product description..."
                                  />
                                </td>
                                <td className="py-1.5 pr-1.5 text-right">
                                  <input
                                    type="number"
                                    value={sku.qty}
                                    onChange={(e) => {
                                      const copy = { ...editingProjection };
                                      copy.orders[stageIdx].sku_items[skuIdx].qty = parseFloat(e.target.value) || 0;
                                      recalculateProjection(copy);
                                      setEditingProjection({ ...copy });
                                    }}
                                    className="h-7 px-2 border border-slate-200 rounded w-20 text-right text-xs bg-white focus:outline-none focus:border-[#0B57D0]"
                                  />
                                </td>
                                <td className="py-1.5 pr-1.5 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={sku.cost_price}
                                    onChange={(e) => {
                                      const copy = { ...editingProjection };
                                      copy.orders[stageIdx].sku_items[skuIdx].cost_price = parseFloat(e.target.value) || 0;
                                      recalculateProjection(copy);
                                      setEditingProjection({ ...copy });
                                    }}
                                    className="h-7 px-2 border border-slate-200 rounded w-20 text-right text-xs bg-white focus:outline-none focus:border-[#0B57D0]"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="py-1.5 pr-1.5 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={sku.unit_price}
                                    onChange={(e) => {
                                      const copy = { ...editingProjection };
                                      copy.orders[stageIdx].sku_items[skuIdx].unit_price = parseFloat(e.target.value) || 0;
                                      recalculateProjection(copy);
                                      setEditingProjection({ ...copy });
                                    }}
                                    className="h-7 px-2 border border-slate-200 rounded w-20 text-right text-xs bg-white focus:outline-none focus:border-[#0B57D0]"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="py-1.5 text-right font-bold text-zinc-900 pr-1">
                                  ${(Number(sku.qty || 0) * Number(sku.unit_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-1.5 text-center">
                                  {stage.sku_items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = { ...editingProjection };
                                        copy.orders[stageIdx].sku_items.splice(skuIdx, 1);
                                        recalculateProjection(copy);
                                        setEditingProjection({ ...copy });
                                      }}
                                      className="text-zinc-400 hover:text-rose-600 p-0.5"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...editingProjection };
                            copy.orders[stageIdx].sku_items.push({
                              sku_id: "",
                              sku_name: "",
                              qty: 2000,
                              unit_price: 0,
                              cost_price: 0
                            });
                            recalculateProjection(copy);
                            setEditingProjection({ ...copy });
                          }}
                          className="text-[11px] font-semibold text-[#0B57D0] hover:text-[#0842A0] flex items-center gap-1 mt-2 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add SKU Line</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Listing & Marketing Fees */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-zinc-900">
                    Commercial Listing & Marketing Fees
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = { ...editingProjection };
                      copy.costs.push({
                        cost_title: "Slotting / A&P Fee",
                        total_cost: 5000,
                        share_entities: [],
                        net_cost_we_pay: 5000
                      });
                      recalculateProjection(copy);
                      setEditingProjection({ ...copy });
                    }}
                    className="text-xs font-semibold text-[#0B57D0] hover:text-[#0842A0] flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Fee</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editingProjection.costs.map((cost, costIdx) => {
                    const otherEntities = cost.share_entities || [];
                    const otherEntitiesPct = otherEntities.reduce((sum: number, ent: any) => sum + Number(ent.percentage || 0), 0);
                    const wePayPct = Math.max(0, 100 - otherEntitiesPct);

                    return (
                      <div key={costIdx} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <input
                            type="text"
                            value={cost.cost_title}
                            onChange={(e) => {
                              const copy = { ...editingProjection };
                              copy.costs[costIdx].cost_title = e.target.value;
                              setEditingProjection({ ...copy });
                            }}
                            className="h-7 px-2 border border-slate-200 rounded text-xs flex-1 bg-white focus:outline-none focus:border-[#0B57D0]"
                            placeholder="Fee title (e.g. Listing / Slotting Fee)"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-500">Total:</span>
                            <input
                              type="number"
                              value={cost.total_cost}
                              onChange={(e) => {
                                const copy = { ...editingProjection };
                                copy.costs[costIdx].total_cost = parseFloat(e.target.value) || 0;
                                recalculateProjection(copy);
                                setEditingProjection({ ...copy });
                              }}
                              className="h-7 px-2 border border-slate-200 rounded text-xs w-24 text-right font-semibold bg-white focus:outline-none focus:border-[#0B57D0]"
                            />
                          </div>
                          <div className="text-[11px] text-zinc-700 font-semibold bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                            We Pay ({wePayPct}%): <span className="text-zinc-950 font-bold">${cost.net_cost_we_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = { ...editingProjection };
                              copy.costs.splice(costIdx, 1);
                              recalculateProjection(copy);
                              setEditingProjection({ ...copy });
                            }}
                            className="text-zinc-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Co-Funder / Entity Contributions */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Entity Pay:</span>
                          {otherEntities.map((ent, entIdx) => (
                            <div key={entIdx} className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-xs">
                              <input
                                type="text"
                                value={ent.entity_name}
                                onChange={(e) => {
                                  const copy = { ...editingProjection };
                                  copy.costs[costIdx].share_entities[entIdx].entity_name = e.target.value;
                                  recalculateProjection(copy);
                                  setEditingProjection({ ...copy });
                                }}
                                className="w-24 bg-transparent text-xs outline-none font-medium text-zinc-800"
                                placeholder="Brand / Partner"
                              />
                              <input
                                type="number"
                                value={ent.percentage}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const copy = { ...editingProjection };
                                  copy.costs[costIdx].share_entities[entIdx].percentage = val;
                                  recalculateProjection(copy);
                                  setEditingProjection({ ...copy });
                                }}
                                className="w-12 bg-white border border-slate-200 rounded text-right text-xs px-1 font-semibold focus:outline-none focus:border-[#0B57D0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-zinc-500 text-[10px]">%</span>
                              <span className="text-zinc-700 font-bold ml-1 text-[11px]">${ent.amount?.toFixed(0)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = { ...editingProjection };
                                  copy.costs[costIdx].share_entities.splice(entIdx, 1);
                                  recalculateProjection(copy);
                                  setEditingProjection({ ...copy });
                                }}
                                className="text-zinc-400 hover:text-rose-600 ml-1 p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {otherEntities.length < 5 && (
                            <button
                              type="button"
                              onClick={() => {
                                const copy = { ...editingProjection };
                                copy.costs[costIdx].share_entities.push({
                                  entity_name: `Brand`,
                                  percentage: 30,
                                  amount: 0
                                });
                                recalculateProjection(copy);
                                setEditingProjection({ ...copy });
                              }}
                              className="text-[11px] font-semibold text-[#0B57D0] hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Entity Pay</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Live Summary Strip */}
              <div className="bg-[#F8F9FA] p-3 rounded-lg border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Projected Revenue</span>
                  <div className="text-sm font-bold text-zinc-950 mt-0.5">
                    ${editingProjection.total_projected_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Factory Cost</span>
                  <div className="text-sm font-bold text-zinc-950 mt-0.5">
                    ${editingProjection.total_projected_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Net Listing (We Pay)</span>
                  <div className="text-sm font-bold text-zinc-950 mt-0.5">
                    ${editingProjection.net_listing_fees_we_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Projected Net Profit</span>
                  <div className={`text-sm font-bold mt-0.5 ${editingProjection.net_projected_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    ${editingProjection.net_projected_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-zinc-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-slate-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjection}
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Projection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog (Compliant with Section 5 No-Native-Browser-Dialog rule) */}
      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, open }))}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant || "dark"}
        onConfirm={confirmConfig.onConfirm}
      />
    </div>
  );
}
