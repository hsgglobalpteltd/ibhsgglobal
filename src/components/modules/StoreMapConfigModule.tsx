"use client";

import * as React from "react";
import { showToast } from "@/lib/toast";
import { Globe, MapPin, Save, Layers, ListFilter } from "lucide-react";
import { CustomButton } from "../custom-button";

interface StoreMapConfigModuleProps {
  idToken?: string;
  profile?: any;
}

const getLocalWorkerUrl = () => {
  if (typeof window === "undefined") return "https://ib.hsgglobalpteltd.workers.dev";
  const hostname = window.location.hostname;
  const isLocal = 
    hostname === "localhost" || 
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.");
  if (!isLocal) return "https://ib.hsgglobalpteltd.workers.dev";
  const targetHost = hostname === "localhost" ? "127.0.0.1" : hostname;
  return `http://${targetHost}:8787`;
};

const WORKER_URL = getLocalWorkerUrl();

export function StoreMapConfigModule({ idToken, profile }: StoreMapConfigModuleProps) {
  // DB states
  const [sites, setSites] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [productLogs, setProductLogs] = React.useState<any[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);

  // Selection states
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("main");
  const [selectedBrandId, setSelectedBrandId] = React.useState<string>("");
  const [selectedSkus, setSelectedSkus] = React.useState<string[]>([]);
  
  // Map parameters
  const [centerLat, setCenterLat] = React.useState<number>(1.3521);
  const [centerLng, setCenterLng] = React.useState<number>(103.8198);
  const [zoom, setZoom] = React.useState<number>(12);

  // UI state
  const [loading, setLoading] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [leafletReady, setLeafletReady] = React.useState<boolean>(false);
  const [activeRetailer, setActiveRetailer] = React.useState<string>("All");

  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersLayerRef = React.useRef<any>(null);

  // Load sheets and sites on mount
  const loadInitialData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch sites list
      const sitesRes = await fetch(`${WORKER_URL}/api/admin/sites`, {
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        }
      });
      if (sitesRes.ok) {
        const sitesData = await sitesRes.json();
        setSites(sitesData);
      }

      // 2. Fetch sheet caches (Google Sheets)
      const fetchSheet = async (sheetName: string) => {
        const res = await fetch(`${WORKER_URL}/api/admin/cache?sheet=${sheetName}`);
        if (!res.ok) throw new Error("Failed to fetch " + sheetName);
        const json = await res.json();
        return Array.isArray(json) ? json : (json.value || []);
      };

      const [b, pr, st, pl, rt] = await Promise.all([
        fetchSheet("brands_DB"),
        fetchSheet("products_DB"),
        fetchSheet("Store_Retailer_DB"),
        fetchSheet("Merch_Visit_Product_Audit_Logs"),
        fetchSheet("retailers_DB")
      ]);

      setBrands(b);
      setProducts(pr);
      setStores(st);
      setProductLogs(pl);
      setRetailers(rt);

      if (b.length > 0) {
        setSelectedBrandId(String(b[0].ID));
      }
    } catch (err: any) {
      showToast("Failed to load initial map data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load saved configuration when site changes
  React.useEffect(() => {
    if (!selectedSiteId) return;

    const loadSiteConfig = async () => {
      try {
        const res = await fetch(`${WORKER_URL}/api/admin/sites/map-config?site_id=${selectedSiteId}`, {
          headers: {
            "Authorization": `Bearer ${idToken}`,
            "X-Session-ID": localStorage.getItem("session_id") || ""
          }
        });
        if (res.ok) {
          const config = await res.json();
          if (config.map_brand_id) {
            setSelectedBrandId(config.map_brand_id);
            try {
              const skus = typeof config.map_product_skus === "string" 
                ? JSON.parse(config.map_product_skus) 
                : (config.map_product_skus || []);
              setSelectedSkus(skus);
            } catch {
              setSelectedSkus([]);
            }
            if (config.map_center_lat) setCenterLat(config.map_center_lat);
            if (config.map_center_lng) setCenterLng(config.map_center_lng);
            if (config.map_zoom) setZoom(config.map_zoom);
          } else {
            // Reset to defaults if no config saved
            setSelectedSkus([]);
            setCenterLat(1.3521);
            setCenterLng(103.8198);
            setZoom(12);
          }
        }
      } catch (err: any) {
        console.error("Failed to load site config:", err);
      }
    };

    loadSiteConfig();
  }, [selectedSiteId, idToken]);

  // Dynamically load Leaflet CDN scripts/css
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setLeafletReady(true);
      document.body.appendChild(script);
    } else {
      setLeafletReady(true);
    }
  }, []);

  // Filter products belonging to selected Brand
  const brandProducts = React.useMemo(() => {
    if (!selectedBrandId) return [];
    return products.filter((p: any) => {
      const bId = p["Brands ID"] || p["Brand ID"];
      return String(bId) === String(selectedBrandId);
    });
  }, [products, selectedBrandId]);

  // Calculate pins locally for real-time preview
  const pins = React.useMemo(() => {
    if (!selectedBrandId || selectedSkus.length === 0 || stores.length === 0) return [];

    const lowerSelectedSkus = selectedSkus.map(s => s.toLowerCase());
    const brandSkus = brandProducts.map((p: any) => String(p.SKU).toLowerCase());

    const resultPins: any[] = [];

    stores.forEach((store: any) => {
      const pinLoc = String(store["Pin Locations"] || "").trim();
      if (!pinLoc) return;

      const coords = pinLoc.split(",").map(s => parseFloat(s.trim()));
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return;

      // Find logs for this store
      const storeLogs = productLogs.filter((log: any) => {
        const sId = log["Retailer Stores ID"] || log["Store ID"];
        return String(sId) === String(store.ID);
      });

      if (storeLogs.length === 0) return;

      // Sort descending for latest log
      const latestLog = [...storeLogs].sort((a: any, b: any) => {
        return (Number(b.Timestamp) || 0) - (Number(a.Timestamp) || 0);
      })[0];

      let auditedSkus: any[] = [];
      try {
        auditedSkus = JSON.parse(latestLog["Audit JSON"] || "[]");
      } catch {}

      const stockProducts: any[] = [];
      let hasStock = false;

      auditedSkus.forEach((auditItem: any) => {
        const sku = String(auditItem.sku).toLowerCase();
        if (lowerSelectedSkus.includes(sku) && brandSkus.includes(sku)) {
          const qty = Number(auditItem.qty) || 0;
          if (qty > 0) {
            const prodDetail = brandProducts.find((p: any) => String(p.SKU).toLowerCase() === sku);
            stockProducts.push({
              name: prodDetail ? prodDetail["Display Name"] : auditItem.sku,
              qty,
              image: prodDetail ? prodDetail["Image"] : ""
            });
            hasStock = true;
          }
        }
      });

      if (hasStock) {
        const retId = store["Retailers ID"] || store["Retailer ID"];
        const retailer = retailers.find((r: any) => String(r.ID) === String(retId));
        const retailerName = retailer ? retailer["Display Name"] : "";
        const storeName = store["Display Name"] || `Store #${store.ID}`;
        const pinTitle = retailerName ? `${retailerName} - ${storeName}` : storeName;

        resultPins.push({
          id: store.ID,
          name: pinTitle,
          address: store.Address || "",
          lat: coords[0],
          lng: coords[1],
          retailer_logo: retailer ? retailer["Logo Image"] : "",
          retailer_name: retailerName,
          stock: stockProducts
        });
      }
    });

    return resultPins;
  }, [selectedBrandId, selectedSkus, stores, productLogs, brandProducts, retailers]);

  // Compute unique retailers list from active pins
  const uniqueRetailersList = React.useMemo(() => {
    const list: { name: string; logo: string }[] = [];
    const seen = new Set<string>();
    pins.forEach((pin: any) => {
      if (pin.retailer_name && !seen.has(pin.retailer_name)) {
        seen.add(pin.retailer_name);
        list.push({
          name: pin.retailer_name,
          logo: pin.retailer_logo
        });
      }
    });
    return list;
  }, [pins]);

  // Filter pins based on activeRetailer state
  const filteredPins = React.useMemo(() => {
    if (activeRetailer === "All") return pins;
    return pins.filter((p: any) => p.retailer_name === activeRetailer);
  }, [pins, activeRetailer]);

  // 1. Leaflet Map Container Initialization
  React.useEffect(() => {
    if (!leafletReady || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], zoom);
    mapRef.current = map;

    // Apply CartoDB light greyscale map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    // Save map position when dragging/zooming completes
    map.on("moveend", () => {
      const center = map.getCenter();
      setCenterLat(center.lat);
      setCenterLng(center.lng);
    });

    map.on("zoomend", () => {
      setZoom(map.getZoom());
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletReady]);

  // 2. Leaflet Marker Rendering (Flicker-free updates when tabs are clicked)
  React.useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !markersLayerRef.current) return;

    // Clear old markers
    markersLayerRef.current.clearLayers();

    // Render new filtered markers
    filteredPins.forEach((pin: any) => {
      const logoUrl = pin.retailer_logo;
      const hasLogo = !!logoUrl;
      const iconHtml = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${hasLogo ? 'white' : '#2563eb'};
          box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.12);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${hasLogo ? `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" />` : ''}
        </div>
      `;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-retailer-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });
      const productsHtml = pin.stock.map((p: any) => `
        <div style="width: 50px; height: 50px; border-radius: 8px; border: 1px solid #e4e4e7; overflow: hidden; background: #fafafa; display: flex; align-items: center; justify-content: center;" title="${p.name}">
          <img src="${p.image || 'https://via.placeholder.com/50'}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      `).join("");

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size:12px; width: 220px; line-height: 1.4; text-align: center; box-sizing: border-box;">
          <h4 style="margin:0 0 2px 0; color:#18181b; font-weight:800; font-size:13.5px;">${pin.retailer_name}</h4>
          <p style="margin:0 0 10px 0; color:#71717a; font-size:11px;">${pin.address}</p>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; border-top: 1px solid #e4e4e7; padding-top: 10px; margin-top: 6px;">
            ${productsHtml}
          </div>
        </div>
      `);

      markersLayerRef.current.addLayer(marker);
    });
  }, [filteredPins, leafletReady]);

  // Trigger fitBounds to show all pins if they change
  const handleAutoFitBounds = () => {
    if (!mapRef.current || pins.length === 0) return;
    const L = (window as any).L;
    if (!L) return;

    const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const handleToggleSku = (sku: string) => {
    setSelectedSkus(prev => 
      prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]
    );
  };

  const handleSelectAllProducts = () => {
    const allSkus = brandProducts.map((p: any) => String(p.SKU));
    setSelectedSkus(allSkus);
  };

  const handleClearAllProducts = () => {
    setSelectedSkus([]);
  };

  const handleSaveConfig = async () => {
    if (!selectedBrandId) {
      showToast("Please select a brand.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/sites/map-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({
          site_id: selectedSiteId,
          map_brand_id: selectedBrandId,
          map_product_skus: selectedSkus,
          map_center_lat: centerLat,
          map_center_lng: centerLng,
          map_zoom: zoom
        })
      });

      if (!res.ok) throw new Error("Failed to save map configuration");
      showToast("Map configuration saved successfully for website!", "success");
    } catch (err: any) {
      showToast("Error saving configuration: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0 font-primary">
      {/* Header Info */}
      <div className="content-header flex justify-between items-center mb-1 px-1 shrink-0">
        <span className="text-sm font-semibold text-zinc-500">
          Configure the public store locator map brand, product stock visibility, and default center coordinates.
        </span>
        <CustomButton 
          onClick={handleSaveConfig} 
          variant="dark" 
          disabled={saving || loading}
          className="h-9 text-xs flex items-center gap-1.5"
        >
          <Save size={15} />
          {saving ? "Saving..." : "Save Config to Web"}
        </CustomButton>
      </div>

      {/* Main Dual-Column Panel */}
      <div className="content-body flex-1 w-full overflow-hidden flex gap-4 min-h-0 pb-1">
        {/* Left Panel: Configuration Controls (Width 380px) */}
        <div className="w-[380px] bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto shadow-2xs">
          {/* Section 1: Site Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1">
              <Globe size={13} className="text-zinc-500" /> Target Website Site
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-zinc-950 cursor-pointer"
            >
              <option value="main">Main Corporate Website (/main)</option>
              {sites.filter((s: any) => s.id !== "main").map((site: any) => (
                <option key={site.id} value={site.id}>
                  {site.name} (/{site.id})
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-zinc-100" />

          {/* Section 2: Brand Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1">
              <Layers size={13} className="text-zinc-500" /> Select Brand
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                setSelectedSkus([]); // reset skus when brand changes
              }}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-zinc-950 cursor-pointer"
            >
              <option value="" disabled>Select a Brand...</option>
              {brands.map((brand: any) => (
                <option key={brand.ID} value={brand.ID}>
                  {brand["Display Name"]}
                </option>
              ))}
            </select>
          </div>

          {/* Section 3: Products Multi-Select */}
          <div className="flex-1 flex flex-col gap-1.5 min-h-0">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1">
                <ListFilter size={13} className="text-zinc-500" /> Select Products
              </label>
              {brandProducts.length > 0 && (
                <div className="flex gap-2 text-[10px] font-bold text-blue-600">
                  <button onClick={handleSelectAllProducts} className="hover:underline">All</button>
                  <span>|</span>
                  <button onClick={handleClearAllProducts} className="hover:underline">None</button>
                </div>
              )}
            </div>

            {selectedBrandId ? (
              <div className="flex-1 border border-zinc-200 rounded-lg bg-zinc-50 overflow-y-auto p-2.5 flex flex-col gap-2 min-h-[150px]">
                {brandProducts.length === 0 ? (
                  <span className="text-xs text-zinc-400 italic text-center my-auto">No products registered under this brand.</span>
                ) : (
                  brandProducts.map((p: any) => (
                    <label key={p.SKU} className="flex items-start gap-2.5 p-1.5 hover:bg-zinc-100 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300"
                        checked={selectedSkus.includes(String(p.SKU))}
                        onChange={() => handleToggleSku(String(p.SKU))}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-800 leading-tight">{p["Display Name"]}</span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{p.SKU}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-zinc-300 rounded-lg flex items-center justify-center text-center p-4">
                <span className="text-xs text-zinc-400 italic">Select a brand first to configure visible products.</span>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100" />

          {/* Section 4: Coordinates Debugger / Drag feedback */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 flex flex-col gap-1 text-[11px] font-mono text-zinc-600 shrink-0">
            <div className="flex justify-between">
              <span>Center Lat:</span>
              <span className="font-semibold text-zinc-900">{centerLat.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span>Center Lng:</span>
              <span className="font-semibold text-zinc-900">{centerLng.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span>Zoom Level:</span>
              <span className="font-semibold text-zinc-900">{zoom}</span>
            </div>
            <div className="flex justify-between text-[#0b57d0] font-bold border-t pt-1.5 mt-1 font-primary text-[12px]">
              <span>In-Stock Outlets:</span>
              <span>{pins.length} stores</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Map Preview Canvas */}
        <div className="flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden relative shadow-2xs">
          {/* Dynamic Retailer Tabs - Floating Overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 max-w-[90%] w-auto flex gap-2 p-2 bg-white/90 backdrop-blur-xs border border-zinc-200 rounded-xl overflow-x-auto select-none z-20 shadow-sm justify-center items-center">
            <button
              onClick={() => setActiveRetailer("All")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                activeRetailer === "All"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              All
            </button>
            {uniqueRetailersList.map(({ name, logo }) => (
              <button
                key={name}
                onClick={() => setActiveRetailer(name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeRetailer === name
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {logo && <img src={logo} alt={name} className="w-3.5 h-3.5 object-contain rounded-xs" />}
                <span>{name}</span>
              </button>
            ))}
          </div>

          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Style Inject for Greyscale map tiles */}
          <style dangerouslySetInnerHTML={{ __html: `
            .leaflet-container {
              background: #f4f4f5 !important;
            }
            /* Apply greyscale to map tiles */
            .leaflet-tile-container {
              filter: grayscale(100%) contrast(1.1) brightness(0.95);
            }
          `}} />

          {/* Map Helper overlay banner */}
          <div className="absolute bottom-4 left-4 z-20 bg-zinc-950/80 backdrop-blur-xs px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md pointer-events-none select-none flex items-center gap-1.5">
            <MapPin size={13} className="text-red-500" />
            <span>Drag or Zoom map to set the initial visitor landing view</span>
          </div>

          {/* Auto bounds utility */}
          {pins.length > 0 && (
            <button
              onClick={handleAutoFitBounds}
              className="absolute top-4 right-4 z-20 bg-white hover:bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-800 shadow-sm cursor-pointer transition-colors"
            >
              🔍 Auto-Fit to Pins ({pins.length})
            </button>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs z-30 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#0b57d0] border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs font-semibold text-zinc-500">Loading map database...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
