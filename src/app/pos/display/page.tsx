"use client";

import * as React from "react";
import { 
  ShoppingBag, 
  QrCode, 
  CheckCircle2, 
  Building2, 
  Maximize, 
  Minimize, 
  Sparkles
} from "lucide-react";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface CartItem {
  sku: string;
  name: string;
  brand_id?: string;
  brand_name?: string;
  original_price: number;
  price: number;
  qty: number;
  image?: string;
  is_foc: boolean;
  discount_type?: "none" | "percent" | "amount" | "foc";
  discount_val?: number;
  discount_amount?: number;
  subtotal: number;
}

interface POSSettings {
  qr_image_url: string;
  paynow_uen: string;
  paynow_name: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  instructions: string;
  ad_mode: "photos" | "video";
  ad_slides: string[];
  ad_transition: "fade" | "slide";
  ad_interval_sec: number;
  ad_video_url: string;
  ad_media_url: string;
  ad_media_type: "image" | "video";
}

export default function POSCustomerDisplayPage() {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [cartTotals, setCartTotals] = React.useState<{
    subtotal: number;
    totalDiscount: number;
    grandTotal: number;
    totalItemCount: number;
  }>({
    subtotal: 0,
    totalDiscount: 0,
    grandTotal: 0,
    totalItemCount: 0
  });

  const [paymentState, setPaymentState] = React.useState<{
    isOpen: boolean;
    method: string;
    refCode: string;
    cash_received?: number;
    cash_change?: number;
  }>({
    isOpen: false,
    method: "Cash",
    refCode: "",
    cash_received: 0,
    cash_change: 0
  });

  const [completedOrder, setCompletedOrder] = React.useState<any | null>(null);
  const [settings, setSettings] = React.useState<POSSettings>({
    qr_image_url: "",
    paynow_uen: "",
    paynow_name: "",
    bank_name: "",
    bank_account_no: "",
    bank_account_name: "",
    instructions: "",
    ad_mode: "photos",
    ad_slides: [],
    ad_transition: "fade",
    ad_interval_sec: 5,
    ad_video_url: "",
    ad_media_url: "",
    ad_media_type: "image"
  });

  const [currentSlideIndex, setCurrentSlideIndex] = React.useState<number>(0);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [timeStr, setTimeStr] = React.useState<string>("");
  const [partnerLogos, setPartnerLogos] = React.useState<string[]>([]);
  
  // Multi-Device Wireless Pairing State
  const [pairedRegisterId, setPairedRegisterId] = React.useState<string>("REG-1");
  const [isPairKeypadOpen, setIsPairKeypadOpen] = React.useState<boolean>(false);
  const [keypadInput, setKeypadInput] = React.useState<string>("");

  // Initialize Register ID from URL query param (?reg=REG-1) or localStorage
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const regParam = params.get("reg") || params.get("register_id");
        if (regParam) {
          const clean = regParam.toUpperCase().trim();
          setPairedRegisterId(clean);
          localStorage.setItem("pos_display_paired_reg", clean);
        } else {
          const saved = localStorage.getItem("pos_display_paired_reg");
          if (saved) {
            setPairedRegisterId(saved.toUpperCase());
          }
        }
      }
    } catch (e) {
      console.warn("Register param parse error:", e);
    }
  }, []);

  // Fetch Partner & Retailer Logos from Webcatalog API
  React.useEffect(() => {
    const fetchPartnerLogos = async () => {
      try {
        const res = await fetch(`${WORKER_URL}/api/exhibitor/logos`);
        if (res.ok) {
          const data = await res.json();
          const allLogos: string[] = [];
          if (Array.isArray(data.retailers)) {
            data.retailers.forEach((item: any) => {
              if (item?.url) allLogos.push(item.url);
            });
          }
          if (Array.isArray(data.brands)) {
            data.brands.forEach((item: any) => {
              if (item?.url) allLogos.push(item.url);
            });
          }
          setPartnerLogos(allLogos);
        }
      } catch (err) {
        console.warn("Could not fetch partner logos:", err);
      }
    };
    fetchPartnerLogos();
  }, []);

  // Slideshow Timer Loop for Photo Slides
  React.useEffect(() => {
    if (settings.ad_mode !== "photos" || !settings.ad_slides || settings.ad_slides.length <= 1) {
      return;
    }
    const intervalMs = Math.max(2, settings.ad_interval_sec || 5) * 1000;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % settings.ad_slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [settings.ad_mode, settings.ad_slides, settings.ad_interval_sec]);

  // Live 24-Hour Digital Clock
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen Listener
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (e) {
      console.warn("Fullscreen toggle error:", e);
    }
  };

  // Fetch POS Payment & QR Settings from backend
  const loadSettings = React.useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/settings`);
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || data.data;
        if (s) {
          setSettings({
            qr_image_url: s.qr_image_url || "",
            paynow_uen: s.paynow_uen || "",
            paynow_name: s.paynow_name || "",
            bank_name: s.bank_name || "",
            bank_account_no: s.bank_account_no || "",
            bank_account_name: s.bank_account_name || "",
            instructions: s.instructions || "",
            ad_mode: s.ad_mode === "video" ? "video" : "photos",
            ad_slides: Array.isArray(s.ad_slides) ? s.ad_slides : (s.ad_slides ? JSON.parse(s.ad_slides) : []),
            ad_transition: s.ad_transition === "slide" ? "slide" : "fade",
            ad_interval_sec: Number(s.ad_interval_sec) || 5,
            ad_video_url: s.ad_video_url || "",
            ad_media_url: s.ad_media_url || "",
            ad_media_type: (s.ad_media_type === "video" ? "video" : "image")
          });
        }
      }
    } catch (err) {
      console.warn("Could not load POS settings:", err);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Synchronize with Cashier Terminal via BroadcastChannel, LocalStorage & Cloud Wireless Sync
  React.useEffect(() => {
    const applySyncData = (data: any) => {
      if (!data) return;
      // If data is tagged with a register_id, ensure it matches
      if (data.register_id && data.register_id.toUpperCase() !== pairedRegisterId.toUpperCase()) {
        return;
      }

      if (data.type === "CART_UPDATE") {
        setCart(data.cart || []);
        setCartTotals(data.totals || { subtotal: 0, totalDiscount: 0, grandTotal: 0, totalItemCount: 0 });
        if (data.completedOrder !== undefined) setCompletedOrder(data.completedOrder);
        if (data.paymentState !== undefined) setPaymentState(data.paymentState);
      } else if (data.type === "PAYMENT_STATE") {
        setPaymentState(data.paymentState);
      } else if (data.type === "ORDER_COMPLETED") {
        setCompletedOrder(data.order);
        setCart([]);
        setCartTotals({ subtotal: 0, totalDiscount: 0, grandTotal: 0, totalItemCount: 0 });
      } else if (data.type === "RESET_DISPLAY") {
        setCart([]);
        setCartTotals({ subtotal: 0, totalDiscount: 0, grandTotal: 0, totalItemCount: 0 });
        setCompletedOrder(null);
        setPaymentState({ isOpen: false, method: "Cash", refCode: "" });
      }
    };

    // 1. Read initial state from localStorage
    try {
      const saved = localStorage.getItem("pos_display_sync");
      if (saved) {
        applySyncData(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Storage sync parse error:", e);
    }

    // 2. BroadcastChannel real-time listener (Zero latency for same-device windows)
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("pos_display_channel");
      channel.onmessage = (event) => {
        applySyncData(event.data);
      };
    }

    // 3. Storage event listener (Fallback for across tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "pos_display_sync" && e.newValue) {
        try {
          applySyncData(JSON.parse(e.newValue));
        } catch (_) {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Cloud Wireless Multi-Device Long-Polling Sync (for separate tablets, iPads, mobile)
    let lastCloudUpdate = 0;
    let isCancelled = false;

    const pullCloudSync = async () => {
      if (isCancelled || !pairedRegisterId) return;
      try {
        const res = await fetch(`${WORKER_URL}/api/pos/sync/pull?reg=${encodeURIComponent(pairedRegisterId)}&since=${lastCloudUpdate}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.modified && json.payload) {
            lastCloudUpdate = json.updated_at || Date.now();
            applySyncData(json.payload);
          }
        }
      } catch (err) {
        // Silent background reconnect
      }
    };

    // Poll every 800ms for snappy wireless response
    const cloudInterval = setInterval(pullCloudSync, 800);
    pullCloudSync();

    return () => {
      isCancelled = true;
      clearInterval(cloudInterval);
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [pairedRegisterId]);

  const hasItemsInCart = cart.length > 0;
  const isPaymentReady = paymentState.isOpen || (hasItemsInCart && paymentState.method !== "Cash");
  const isCompleted = !!completedOrder;

  // Render Slideshow Photos or Video Loop Component
  const renderMediaElement = (isScaled: boolean = false) => {
    // 1. VIDEO LOOP MODE
    if (settings.ad_mode === "video" && (settings.ad_video_url || settings.ad_media_url)) {
      const videoSrc = settings.ad_video_url || settings.ad_media_url;
      return (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      );
    }

    // 2. PHOTO SLIDESHOW MODE (Up to 10 photos)
    const slides = (settings.ad_slides && settings.ad_slides.length > 0)
      ? settings.ad_slides
      : (settings.ad_media_url ? [settings.ad_media_url] : []);

    if (slides.length > 0) {
      const isSlideTransition = settings.ad_transition === "slide";

      if (isSlideTransition) {
        return (
          <div className="relative w-full h-full overflow-hidden">
            <div
              className="flex w-full h-full transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${(currentSlideIndex % slides.length) * 100}%)`
              }}
            >
              {slides.map((src, idx) => (
                <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center">
                  <img
                    src={src}
                    alt={`Slide ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {slides.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-md">
                {slides.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === (currentSlideIndex % slides.length) ? "w-6 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      // Default Smooth Cross-Fade
      return (
        <div className="relative w-full h-full overflow-hidden">
          {slides.map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`Slide ${idx + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                idx === (currentSlideIndex % slides.length) ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            />
          ))}

          {slides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-md">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === (currentSlideIndex % slides.length) ? "w-6 bg-white" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // 3. Fallback Minimal Clean White Standby Screen
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white text-center p-8 gap-5 animate-in fade-in duration-300">
        <div className={`${isScaled ? "w-16 h-16 rounded-2xl" : "w-24 h-24 rounded-3xl"} bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B57D0] shadow-xs`}>
          <span className={`${isScaled ? "text-2xl" : "text-3xl"} font-black tracking-wider text-[#0B57D0]`}>iB</span>
        </div>
        <div className="space-y-1.5 max-w-md">
          <h1 className={`${isScaled ? "text-2xl" : "text-3xl"} font-extrabold tracking-tight text-zinc-900`}>Welcome to HSG Global</h1>
          <p className="text-sm text-zinc-500 font-medium">Discover our latest products and exclusive in-store deals.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-screen w-screen bg-white text-zinc-900 overflow-hidden font-primary select-none flex flex-col justify-between">
      <style jsx global>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marqueeScroll 28s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      {/* Discreet Fullscreen & Clock Controls Overlay (Over base media, but under cart drawer) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2.5 opacity-30 hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => {
            setKeypadInput(pairedRegisterId);
            setIsPairKeypadOpen(true);
          }}
          className="font-mono text-[11px] font-bold text-zinc-700 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-full shadow-xs backdrop-blur-md flex items-center gap-1.5 cursor-pointer hover:bg-white"
          title="Change Paired Register"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{pairedRegisterId}</span>
        </button>

        <span className="font-mono text-xs font-bold text-zinc-700 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-full shadow-xs backdrop-blur-md">
          {timeStr}
        </span>
        
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 bg-white/90 hover:bg-white text-zinc-700 hover:text-zinc-950 border border-slate-200 rounded-full transition-all shadow-xs backdrop-blur-md cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Paired Register Switcher Modal */}
      {isPairKeypadOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1.5px] flex items-center justify-center p-4 font-primary animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xs w-full p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B57D0] flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-950">Pair with POS Register</h3>
              <p className="text-xs text-zinc-500">Enter the register identifier (e.g. REG-1)</p>
            </div>
            <input
              type="text"
              value={keypadInput}
              onChange={(e) => setKeypadInput(e.target.value.toUpperCase().trim())}
              placeholder="REG-1"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-center uppercase focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
            />
            <div className="flex gap-2 w-full pt-2">
              <button
                type="button"
                onClick={() => setIsPairKeypadOpen(false)}
                className="flex-1 py-2 border border-slate-200 bg-white text-zinc-700 font-bold text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const reg = keypadInput || "REG-1";
                  setPairedRegisterId(reg);
                  localStorage.setItem("pos_display_paired_reg", reg);
                  setIsPairKeypadOpen(false);
                }}
                className="flex-1 py-2 bg-[#0B57D0] text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: DEFAULT IDLE MODE (Empty Cart) -> Clean Edge-to-Edge Media       */}
      {/* ========================================================================= */}
      {!hasItemsInCart && !isCompleted && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-white overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 w-full h-full flex items-center justify-center relative">
            {renderMediaElement(false)}
          </div>

          {/* Bottom Infinite Logo Marquee Strip (Scrolling Left) */}
          {partnerLogos.length > 0 && (
            <div className="w-full bg-white/95 backdrop-blur-md border-t border-slate-100 py-3.5 px-4 overflow-hidden shrink-0 z-20 flex items-center shadow-xs">
              <div className="animate-marquee items-center gap-12 sm:gap-16">
                {/* Loop list twice for seamless infinite scrolling */}
                {[...partnerLogos, ...partnerLogos].map((logoUrl, i) => (
                  <div key={i} className="h-8 sm:h-9 flex items-center justify-center shrink-0 px-2">
                    <img
                      src={logoUrl}
                      alt="Partner Brand"
                      className="max-h-full max-w-[130px] object-contain opacity-75 hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: ACTIVE SCANNING / INPUT (Items in cart, not yet in payment modal) */}
      {/* Media becomes smaller on left, Live Cart card container on right side     */}
      {/* ========================================================================= */}
      {hasItemsInCart && !paymentState.isOpen && !isCompleted && (
        <div className="w-full h-full flex overflow-hidden bg-slate-50 relative z-30">
          
          {/* Scaled-down Left Media Panel */}
          <div className="flex-1 h-full bg-white relative overflow-hidden flex items-center justify-center border-r border-slate-200">
            {renderMediaElement(true)}
            {/* Subtle Gradient Shadow into Cart */}
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-200/40 to-transparent pointer-events-none z-20" />
          </div>

          {/* Right Side: Clean Borderless Cart Container (45% Width) */}
          <div className="w-[460px] xl:w-[520px] h-full bg-white text-zinc-900 flex flex-col justify-between shadow-2xl z-40 relative">
            
            {/* Cart Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B57D0] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-950 leading-tight">Your Cart</h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    {cartTotals.totalItemCount} {cartTotals.totalItemCount === 1 ? "item" : "items"} scanned
                  </p>
                </div>
              </div>

              {cartTotals.totalDiscount > 0 && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold font-mono">
                  Saved: -${cartTotals.totalDiscount.toFixed(2)}
                </span>
              )}
            </div>

            {/* Scanned Items List */}
            <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
              {cart.map((item, idx) => (
                <div key={`${item.sku}-${idx}`} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.sku} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-zinc-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900 truncate">{item.name}</h4>
                        {item.is_foc && (
                          <span className="px-2 py-0.5 bg-[#0B57D0] text-white text-[10px] font-bold rounded">FOC</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-500">{item.sku}</span>
                        <span>•</span>
                        <span className="font-mono">${item.original_price.toFixed(2)} ea</span>
                        {item.discount_amount && item.discount_amount > 0 && !item.is_foc && (
                          <span className="text-amber-600 font-bold font-mono">(-${item.discount_amount.toFixed(2)})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold font-mono text-zinc-800">
                      ×{item.qty}
                    </span>
                    <span className="text-base font-mono font-bold text-zinc-950 w-16 text-right">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Total Bar */}
            <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex flex-col gap-2">
              <div className="flex justify-between text-xs text-zinc-500 font-medium">
                <span>Subtotal ({cartTotals.totalItemCount} items)</span>
                <span className="font-mono font-bold text-zinc-700">${cartTotals.subtotal.toFixed(2)}</span>
              </div>

              {cartTotals.totalDiscount > 0 && (
                <div className="flex justify-between text-xs text-[#0B57D0] font-bold">
                  <span>Discounts Applied</span>
                  <span className="font-mono">-${cartTotals.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                <span className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Total Due:</span>
                <span className="text-3xl font-mono font-black text-emerald-600 tracking-tight">
                  ${cartTotals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: PAYMENT READY -> Clean Minimalist White with Big Centered Amount  */}
      {/* ========================================================================= */}
      {hasItemsInCart && paymentState.isOpen && !isCompleted && (
        <div className="w-full h-full flex flex-col items-center justify-between bg-white px-8 py-10 z-30 animate-in fade-in duration-200 font-primary">
          
          {/* Top Clean Header */}
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
              {paymentState.method === "Cash"
                ? "Cash Payment"
                : paymentState.method === "QR"
                ? "Scan SGQR / PayNow to Pay"
                : paymentState.method === "Transfer Bank"
                ? "Bank Transfer / PayNow UEN"
                : "Complimentary FOC"}
            </span>
          </div>

          {/* Center Main Stage: Big Centered Amount & Direct Payment Graphic */}
          <div className="flex flex-col items-center justify-center gap-6 my-auto max-w-lg w-full">
            
            {/* Big Prominent Centered Amount */}
            <div className="flex flex-col items-center text-center gap-0.5">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Amount</span>
              <div className="text-6xl sm:text-7xl font-mono font-black text-zinc-950 tracking-tight">
                ${cartTotals.grandTotal.toFixed(2)}
              </div>
            </div>

            {/* 1. QR CODE ONLY MODE */}
            {paymentState.method === "QR" && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-64 h-64 sm:w-72 sm:h-72 bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                  {settings.qr_image_url ? (
                    <img
                      src={settings.qr_image_url}
                      alt="Payment QR"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 text-center p-4">
                      <QrCode className="w-16 h-16 text-zinc-300" />
                      <span className="text-xs font-bold text-zinc-600">Scan QR Code</span>
                    </div>
                  )}
                </div>
                {settings.instructions && (
                  <p className="text-xs text-zinc-500 text-center max-w-sm">
                    {settings.instructions}
                  </p>
                )}
              </div>
            )}

            {/* 2. TRANSFER BANK MODE (Clean Monochromatic Bank & PayNow) */}
            {paymentState.method === "Transfer Bank" && (
              <div className="flex flex-col gap-3 w-full max-w-md">
                {settings.paynow_uen && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">PayNow UEN</span>
                      <span className="text-xs font-medium text-zinc-700">{settings.paynow_name || "HSG GLOBAL PTE LTD"}</span>
                    </div>
                    <span className="font-mono text-lg font-black text-zinc-950 tracking-wider">
                      {settings.paynow_uen}
                    </span>
                  </div>
                )}

                {settings.bank_account_no && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        {settings.bank_name || "Bank Account"}
                      </span>
                      <span className="text-xs font-medium text-zinc-700">{settings.bank_account_name || "HSG GLOBAL PTE LTD"}</span>
                    </div>
                    <span className="font-mono text-lg font-black text-zinc-950 tracking-wider">
                      {settings.bank_account_no}
                    </span>
                  </div>
                )}

                {settings.instructions && (
                  <p className="text-xs text-zinc-500 text-center mt-1">
                    {settings.instructions}
                  </p>
                )}
              </div>
            )}

            {/* 3. CASH MODE (Live Cash Received & Balance / Change Due) */}
            {paymentState.method === "Cash" && (
              <div className="flex flex-col gap-3 w-full max-w-sm">
                {(paymentState.cash_received && paymentState.cash_received > 0) ? (
                  <div className="flex flex-col gap-2.5 p-5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                      <span>Cash Tendered:</span>
                      <span className="font-mono font-bold text-zinc-900 text-sm">
                        ${paymentState.cash_received.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                      <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                        {(paymentState.cash_change !== undefined && paymentState.cash_change >= 0) ? "Change / Balance Due:" : "Balance Left:"}
                      </span>
                      <span className={`font-mono text-2xl font-black ${
                        (paymentState.cash_change !== undefined && paymentState.cash_change >= 0) 
                          ? "text-emerald-600" 
                          : "text-amber-600"
                      }`}>
                        ${Math.abs(paymentState.cash_change || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-1 py-4">
                    <p className="text-sm font-semibold text-zinc-600">Please hand cash to cashier</p>
                  </div>
                )}
              </div>
            )}

            {/* 4. FOC MODE */}
            {paymentState.method === "FOC" && (
              <div className="text-center space-y-1">
                <span className="px-3 py-1 bg-slate-100 text-zinc-800 rounded-full text-xs font-bold">100% Complimentary</span>
              </div>
            )}

          </div>

          {/* Subtle Bottom Help Note */}
          <div className="text-center text-[11px] text-zinc-400 font-medium">
            HSG Global POS System
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: TRANSACTION COMPLETED SUCCESS (Clean White State)                 */}
      {/* ========================================================================= */}
      {isCompleted && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white p-8 gap-6 animate-in zoom-in-95 duration-300 font-primary">
          <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-14 h-14" />
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-3xl font-black text-zinc-950 tracking-tight">Payment Completed!</h2>
            <p className="text-sm text-zinc-500 font-medium">Thank you for shopping with HSG Global.</p>
          </div>

          {/* Cash Payment: Prominent Change Balance Due Card */}
          {completedOrder.payment_method === "Cash" && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex flex-col items-center gap-1 w-full max-w-xs shadow-xs animate-in zoom-in-95 duration-200">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Change / Balance Given</span>
              <span className="text-4xl font-mono font-black text-emerald-700 tracking-tight">
                ${Number(completedOrder.cash_change || 0).toFixed(2)}
              </span>
              {completedOrder.cash_received && (
                <span className="text-[11px] font-mono font-medium text-emerald-800/80 mt-0.5">
                  (Cash Received: ${Number(completedOrder.cash_received).toFixed(2)})
                </span>
              )}
            </div>
          )}

          <div className="w-full max-w-xs bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex flex-col gap-2.5">
            <div className="flex justify-between">
              <span className="text-zinc-500">Order ID:</span>
              <span className="font-mono font-bold text-zinc-900">{completedOrder.id}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-zinc-500">Total Amount:</span>
              <span className="font-mono font-black text-zinc-900 text-base">${Number(completedOrder.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Payment Mode:</span>
              <span className="font-bold text-zinc-900">{completedOrder.payment_method}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
