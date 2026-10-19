"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Search, Plus, Trash2, X, Store, Check, AlertTriangle, Layers, ChevronDown, Edit2 } from "lucide-react";
import { showToast } from "@/lib/toast";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface MappedItem {
  sku: string;
  name: string;
  qty: number;
}

interface SkuMapping {
  id: string;
  seller_sku: string;
  tiktok_product_name: string;
  shop_id: string;
  shop_name: string;
  items: MappedItem[];
  is_assigned: boolean;
  is_free_gift?: boolean;
  updated_at: number;
  updated_by?: string;
}

interface ProductDbItem {
  sku: string;
  display_name: string;
  brands_id?: string;
  image?: string;
}

interface Shop {
  id: string;
  name: string;
}

function ProductSearchSelect({
  value,
  onChange,
  products,
  autoFocus
}: {
  value: string;
  onChange: (sku: string) => void;
  products: ProductDbItem[];
  autoFocus?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(!!autoFocus);
  const [query, setQuery] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
    if (autoFocus) {
      // Delay slightly to ensure layout and trigger element rects are established
      const t = setTimeout(() => {
        setIsOpen(true);
        triggerRef.current?.scrollIntoView({ block: "nearest" });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const updateCoords = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 224; // max-h-56 is 14rem = 224px
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldFlip = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        top: shouldFlip ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      updateCoords();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  const selectedProduct = React.useMemo(() => {
    if (!value) return null;
    return products.find(p => p.sku === value) || null;
  }, [value, products]);

  const filteredProducts = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    return products.filter(p => 
      p.sku.toLowerCase().includes(q) || 
      p.display_name.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [products, query]);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className="w-full h-8 px-2 text-xs flex items-center justify-between gap-1.5 transition cursor-pointer text-left rounded hover:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/30 focus:border-[#0B57D0]"
      >
        {selectedProduct ? (
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-mono font-medium text-zinc-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] shrink-0 border border-slate-200">
              {selectedProduct.sku}
            </span>
            <span className="text-zinc-700 truncate font-normal">
              {selectedProduct.display_name}
            </span>
          </div>
        ) : (
          <span className="text-zinc-400 font-normal">Select SKU...</span>
        )}
        <ChevronDown size={13} className={`text-zinc-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-2xl flex flex-col max-h-56 overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-primary"
        >
          <div className="p-1.5 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/80 shrink-0">
            <Search size={13} className="text-zinc-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Filter by SKU or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filteredProducts.length >= 1) {
                    onChange(filteredProducts[0].sku);
                    setIsOpen(false);
                    // Focus the Qty input in the same table row
                    setTimeout(() => {
                      const row = triggerRef.current?.closest("tr");
                      const qtyInput = row?.querySelector("input[type='number']") as HTMLInputElement | null;
                      qtyInput?.focus();
                      qtyInput?.select();
                    }, 50);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setIsOpen(false);
                  triggerRef.current?.focus();
                } else if (e.key === "Tab") {
                  // If user tabs while dropdown is open, close and let normal tab flow continue
                  setIsOpen(false);
                }
              }}
              className="w-full bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-0.5 text-zinc-400 hover:text-zinc-600 rounded cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
            {!query.trim() ? (
              <div className="p-3 text-center text-xs text-zinc-400">
                Type SKU or product name to search...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-400 italic">
                No matching product found
              </div>
            ) : (
              filteredProducts.map(p => {
                const isCurrent = p.sku === value;
                return (
                  <div
                    key={p.sku}
                    onClick={() => {
                      onChange(p.sku);
                      setIsOpen(false);
                      setTimeout(() => {
                        const row = triggerRef.current?.closest("tr");
                        const qtyInput = row?.querySelector("input[type='number']") as HTMLInputElement | null;
                        qtyInput?.focus();
                        qtyInput?.select();
                      }, 50);
                    }}
                    className={`px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-[#EAF1FB] cursor-pointer transition ${
                      isCurrent ? "bg-[#EAF1FB]/70 text-[#0842A0]" : "text-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono font-medium text-zinc-900 bg-slate-100 px-1 py-0.2 rounded text-[11px] shrink-0 border border-slate-200">
                        {p.sku}
                      </span>
                      <span className="truncate font-normal">
                        {p.display_name}
                      </span>
                    </div>
                    {isCurrent && <Check size={13} className="text-[#0B57D0] shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function TiktokProductsModule({ 
  profile,
  selectedShopId: controlledShopId,
  onSelectShopId
}: { 
  profile?: any;
  selectedShopId?: string;
  onSelectShopId?: (id: string) => void;
}) {
  const [mappings, setMappings] = React.useState<SkuMapping[]>([]);
  const [productsDb, setProductsDb] = React.useState<ProductDbItem[]>([]);
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [internalShopId, setInternalShopId] = React.useState<string>("all");
  const selectedShopId = controlledShopId !== undefined ? controlledShopId : internalShopId;
  const setSelectedShopId = onSelectShopId || setInternalShopId;
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal State for 1-to-many Assignment
  const [editingMapping, setEditingMapping] = React.useState<SkuMapping | null>(null);
  const [modalItems, setModalItems] = React.useState<MappedItem[]>([]);
  const [isFreeGift, setIsFreeGift] = React.useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number | null>(0);
  const [isSaving, setIsSaving] = React.useState(false);

  // Load Data
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch SKU mappings and harvested TikTok items
      const mappingsRes = await fetch(`${WORKER_URL}/api/tiktok/sku-mappings?_t=${Date.now()}`);
      if (!mappingsRes.ok) throw new Error("Failed to load SKU mappings");
      const mappingsData = await mappingsRes.json();
      const rawMappings: SkuMapping[] = mappingsData.mappings || [];

      // Combine duplicate listings with the same Seller SKU & Product Listing
      const combined = new Map<string, SkuMapping>();
      const bySku = new Map<string, SkuMapping>();

      rawMappings.forEach(m => {
        const sKey = (m.seller_sku || "").trim().toLowerCase();
        const pKey = (m.tiktok_product_name || "").trim().toLowerCase();
        const fullKey = `${sKey}:::${pKey}`;
        const hasAssigned = m.is_assigned && Array.isArray(m.items) && m.items.length > 0;

        if (combined.has(fullKey)) {
          const prev = combined.get(fullKey)!;
          const prevAssigned = prev.is_assigned && Array.isArray(prev.items) && prev.items.length > 0;
          if (!prevAssigned && hasAssigned) {
            combined.set(fullKey, m);
            bySku.set(sKey, m);
          } else {
            if (!prev.shop_name && m.shop_name) prev.shop_name = m.shop_name;
          }
          return;
        }

        if (bySku.has(sKey)) {
          const prev = bySku.get(sKey)!;
          const prevAssigned = prev.is_assigned && Array.isArray(prev.items) && prev.items.length > 0;
          if (!prevAssigned && hasAssigned) {
            bySku.set(sKey, m);
            combined.set(fullKey, m);
          } else {
            if (!prev.shop_name && m.shop_name) prev.shop_name = m.shop_name;
          }
          return;
        }

        combined.set(fullKey, m);
        bySku.set(sKey, m);
      });

      const uniqueMappings = Array.from(combined.values());
      setMappings(uniqueMappings);

      // Extract unique shops from mappings
      const shopMap = new Map<string, string>();
      uniqueMappings.forEach(m => {
        if (m.shop_id && m.shop_name) {
          shopMap.set(m.shop_id, m.shop_name);
        }
      });
      const shopList: Shop[] = Array.from(shopMap.entries()).map(([id, name]) => ({ id, name }));
      setShops(shopList);

      // 2. Fetch products from products_db
      const prodsRes = await fetch(`${WORKER_URL}/api/products`);
      if (prodsRes.ok) {
        const prodsData = await prodsRes.json();
        if (Array.isArray(prodsData)) {
          setProductsDb(prodsData.map((p: any) => ({
            sku: String(p.sku || "").trim(),
            display_name: String(p.display_name || p.name || p.sku || "").trim(),
            brands_id: p.brands_id,
            image: p.image
          })));
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load products mapping", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Modal to assign/edit
  const handleOpenModal = (mapping: SkuMapping) => {
    setEditingMapping(mapping);
    setFocusedRowIndex(0);

    const freeGift = !!(
      mapping.is_free_gift ||
      (Array.isArray(mapping.items) && mapping.items.some(it => it.sku === "__FREE_GIFT__" || (it as any).is_free_gift))
    );
    setIsFreeGift(freeGift);

    const normalItems = (mapping.items || []).filter(it => it.sku !== "__FREE_GIFT__" && !(it as any).is_free_gift);
    if (normalItems.length > 0) {
      setModalItems(normalItems.map(it => ({ ...it })));
    } else {
      // Start with 1 empty row only
      setModalItems([{ sku: "", name: "", qty: 1 }]);
    }
  };

  // Add line to modal & focus the new last row
  const handleAddLine = () => {
    setModalItems(prev => {
      const next = [...prev, { sku: "", name: "", qty: 1 }];
      setFocusedRowIndex(next.length - 1);
      return next;
    });
  };

  // Remove line from modal
  const handleRemoveLine = (index: number) => {
    setModalItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update line SKU
  const handleSkuChange = (index: number, selectedSku: string) => {
    const matched = productsDb.find(p => p.sku === selectedSku);
    setModalItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        sku: selectedSku,
        name: matched ? matched.display_name : item.name
      };
    }));
  };

  // Update line Qty
  const handleQtyChange = (index: number, val: number) => {
    const qty = Math.max(1, isNaN(val) ? 1 : val);
    setModalItems(prev => prev.map((item, i) => (i === index ? { ...item, qty } : item)));
  };

  // Save Mapping
  const handleSaveMapping = async () => {
    if (!editingMapping) return;

    let validLines: MappedItem[] = [];

    if (isFreeGift) {
      validLines = [{
        sku: "__FREE_GIFT__",
        name: "Not for sale / No SKU",
        qty: 0
      }];
    } else {
      validLines = modalItems
        .filter(it => it.sku.trim().length > 0)
        .map(it => ({
          sku: it.sku.trim(),
          name: it.name || (productsDb.find(p => p.sku === it.sku.trim())?.display_name || it.sku.trim()),
          qty: Math.max(1, it.qty || 1)
        }));

      if (validLines.length === 0) {
        showToast("Please assign at least one product SKU or mark as Not for sale / No SKU.", "warning");
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingMapping.id,
        seller_sku: editingMapping.seller_sku,
        tiktok_product_name: editingMapping.tiktok_product_name,
        shop_id: editingMapping.shop_id,
        shop_name: editingMapping.shop_name,
        items: validLines,
        is_free_gift: isFreeGift,
        updated_by: profile?.name || "Operator"
      };

      const res = await fetch(`${WORKER_URL}/api/tiktok/sku-mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save mapping");
      }

      const resData = await res.json();
      const saved: SkuMapping = resData.mapping || {
        ...editingMapping,
        items: validLines,
        is_assigned: true,
        is_free_gift: isFreeGift,
        updated_at: Date.now()
      };

      // Update local state
      setMappings(prev => prev.map(m => {
        if (m.seller_sku.toLowerCase() === saved.seller_sku.toLowerCase()) {
          return { ...m, ...saved, is_free_gift: isFreeGift };
        }
        return m;
      }));
      setEditingMapping(null);
      showToast(isFreeGift ? "Saved as Not for sale / No SKU" : "SKU assignment saved successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save mapping", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Mappings
  const filteredMappings = React.useMemo(() => {
    return mappings.filter(m => {
      // 1. Shop filter
      if (selectedShopId !== "all" && m.shop_id !== selectedShopId) {
        return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const skuMatch = (m.seller_sku || "").toLowerCase().includes(q);
        const nameMatch = (m.tiktok_product_name || "").toLowerCase().includes(q);
        const assignedMatch = (m.items || []).some(
          it => it.sku.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)
        );
        if (!skuMatch && !nameMatch && !assignedMatch) return false;
      }

      return true;
    });
  }, [mappings, selectedShopId, searchQuery]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. TOP HEADER BAR */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-zinc-950">TikTok Products & SKU Mapping</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Assign TikTok seller SKUs to internal products for accurate monthly stock output.
          </p>
        </div>

        {/* Right Side: Search Input */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Seller SKU or Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 pl-8 pr-3 w-56 sm:w-64 bg-white border border-slate-200 rounded-lg text-xs font-normal text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
            />
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT: TABLE VIEW */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-2">
            <div className="w-6 h-6 border-2 border-[#0B57D0] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading TikTok listings and mappings...</span>
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-2">
            <Layers size={36} className="text-slate-300 stroke-1" />
            <span className="text-xs font-medium">No TikTok products found for this filter.</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-medium text-zinc-600 w-48">TikTok Seller SKU</th>
                <th className="py-2.5 px-4 font-medium text-zinc-600 w-[340px]">TikTok Product Listing</th>
                <th className="py-2.5 px-4 font-medium text-zinc-600">Assigned Product</th>
                <th className="py-2.5 px-4 font-medium text-zinc-600 w-36">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMappings.map((m) => {
                const isFreeGift = !!(
                  m.is_free_gift ||
                  (Array.isArray(m.items) && m.items.some(it => it.sku === "__FREE_GIFT__" || (it as any).is_free_gift))
                );
                const isAssigned = isFreeGift || (m.is_assigned && Array.isArray(m.items) && m.items.some(it => it.sku && it.sku !== "__FREE_GIFT__"));
                const rawName = m.tiktok_product_name || "—";
                const displayTitle = rawName.length > 50 ? `${rawName.slice(0, 50)}...` : rawName;

                return (
                  <tr key={`${m.seller_sku}_${m.tiktok_product_name}`} className="hover:bg-slate-50/80 transition-colors">
                    {/* Column 1: Seller SKU */}
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-800 select-all w-48">
                      <span>{m.seller_sku}</span>
                    </td>

                    {/* Column 2: TikTok Listing Name (max 50 chars) & Shop */}
                    <td className="py-2.5 px-4 w-[340px]">
                      <div className="font-normal text-zinc-800 leading-snug" title={rawName}>
                        {displayTitle}
                      </div>
                      {m.shop_name && (
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Store size={11} className="text-zinc-400" />
                          <span>{m.shop_name}</span>
                        </div>
                      )}
                    </td>

                    {/* Column 3: Assigned Product (Simple plain text, comma-separated) */}
                    <td className="py-2.5 px-4 text-xs text-zinc-800 leading-relaxed">
                      {isFreeGift ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Not for sale / No SKU
                        </span>
                      ) : isAssigned ? (
                        <span className="font-mono">
                          {m.items.filter(it => it.sku !== "__FREE_GIFT__").map((it) => `${it.sku} (${it.qty})`).join(", ")}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-sans">—</span>
                      )}
                    </td>

                    {/* Column 4: Action */}
                    <td className="py-2.5 px-4">
                      {!isAssigned ? (
                        <button
                          onClick={() => handleOpenModal(m)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition cursor-pointer shadow-2xs"
                          title="Click to assign internal SKUs"
                        >
                          <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                          <span>Unassigned</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(m)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#0B57D0] hover:text-[#0842A0] hover:bg-blue-50/70 border border-slate-200 bg-white transition cursor-pointer shadow-2xs"
                          title="Click to edit SKU mapping"
                        >
                          <Edit2 size={12} className="text-[#0B57D0]" />
                          <span>Edit Mapping</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. MODAL: 1-TO-MANY SKU ASSIGNMENT BUILDER */}
      {editingMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-zinc-950">Assign Product SKUs</h3>
                  <span className="font-mono font-medium text-xs bg-slate-100 text-zinc-900 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {editingMapping.seller_sku}
                  </span>
                  {editingMapping.shop_name && (
                    <span className="text-[11px] text-zinc-500 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {editingMapping.shop_name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate" title={editingMapping.tiktok_product_name || undefined}>
                  {editingMapping.tiktok_product_name || "Map TikTok item to internal products."}
                </p>
              </div>
              <button
                onClick={() => setEditingMapping(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Simple Checkbox */}
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFreeGift}
                  onChange={(e) => setIsFreeGift(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0B57D0] focus:ring-[#0B57D0]/30 border-slate-300 cursor-pointer"
                />
                <span>Not for sale / No SKU</span>
              </label>

              {!isFreeGift && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800">
                      Assigned Products ({modalItems.filter(i => i.sku.trim()).length})
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Select internal SKU and quantity for each item
                    </span>
                  </div>

                  {/* Clean Table Grid Layout with 4-row scroll height */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="max-h-[188px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-[#F8F9FA] border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold text-zinc-600 border-r border-slate-200">Product SKU</th>
                            <th className="py-2.5 px-3 font-semibold text-zinc-600 w-24 text-center border-r border-slate-200">Qty</th>
                            <th className="py-2.5 px-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {modalItems.map((line, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors h-[42px]">
                              <td className="p-1.5 border-r border-slate-200">
                                <ProductSearchSelect
                                  value={line.sku}
                                  onChange={(sku) => handleSkuChange(idx, sku)}
                                  products={productsDb}
                                  autoFocus={focusedRowIndex === idx}
                                />
                              </td>
                              <td className="p-1.5 w-24 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={line.qty}
                                  onChange={(e) => handleQtyChange(idx, parseInt(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (idx === modalItems.length - 1) {
                                        handleAddLine();
                                      }
                                    }
                                  }}
                                  className="h-8 w-16 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20 rounded text-xs font-medium text-center text-zinc-900 outline-none transition"
                                />
                              </td>
                              <td className="p-1.5 w-10 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  disabled={modalItems.length <= 1}
                                  tabIndex={modalItems.length <= 1 ? -1 : 0}
                                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                  title="Remove row"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Table Footer with Add Row */}
                    <div className="border-t border-slate-200 bg-[#F8F9FA] p-2">
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="w-full py-1.5 border border-dashed border-slate-300 hover:border-[#0B57D0] hover:bg-white text-xs font-semibold text-[#0B57D0] rounded flex items-center justify-center gap-1.5 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/30 focus:border-[#0B57D0]"
                      >
                        <Plus size={14} />
                        <span>Add Row</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingMapping(null)}
                className="h-9 px-4 rounded-lg border border-zinc-300/80 bg-white hover:bg-zinc-100/80 text-xs font-semibold text-[#1F1F1F] transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={isSaving}
                className="h-9 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/40"
              >
                {isSaving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
