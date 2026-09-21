"use client";

import * as React from "react";
import { Star, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Building2, Package, ChevronRight, ChevronLeft } from "lucide-react";
import { WORKER_URL } from "@/lib/api";

interface ProductInfo {
  id: string;
  brand_id: string;
  brand_name?: string;
  product_name: string;
  sku?: string;
  category?: string;
  pack_size?: string;
  shelf_life_months?: number;
  storage_condition?: string;
  rsp?: number;
  images?: string[];
}

export default function PublicReviewPage() {
  const [productId, setProductId] = React.useState<string | null>(null);
  const [product, setProduct] = React.useState<ProductInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form State
  const [reviewerName, setReviewerName] = React.useState("");
  const [reviewerType, setReviewerType] = React.useState<"Guest Taster" | "Staff" | "Admin">("Guest Taster");
  const [scores, setScores] = React.useState<{
    taste_aroma: number;
    texture_quality: number;
    packaging_appeal: number;
    price_believability: number;
    usage_occasion: number;
    repeat_purchase: number;
  }>({
    taste_aroma: 4,
    texture_quality: 4,
    packaging_appeal: 4,
    price_believability: 4,
    usage_occasion: 4,
    repeat_purchase: 4
  });
  const [tastingNotes, setTastingNotes] = React.useState("");
  const [decision, setDecision] = React.useState<"Proceed" | "With Conditions" | "Pause" | "Reject">("Proceed");

  // Multi-image slider & Touch Swipe state
  const [activePhotoIdx, setActivePhotoIdx] = React.useState(0);
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [touchEndX, setTouchEndX] = React.useState<number | null>(null);

  const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe && activePhotoIdx < images.length - 1) {
      setActivePhotoIdx((prev) => prev + 1);
    }
    if (isRightSwipe && activePhotoIdx > 0) {
      setActivePhotoIdx((prev) => prev - 1);
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Read URL query parameters
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("pid") || params.get("product_id") || params.get("id");
      if (pid) {
        setProductId(pid);
        fetchProduct(pid);
      } else {
        setLoading(false);
        setErrorMsg("No Product ID specified in URL.");
      }
    }
  }, []);

  const fetchProduct = async (pid: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${WORKER_URL}/api/brand-launchpad/products/${encodeURIComponent(pid)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        throw new Error("Product not found or has been removed.");
      }
      const data = (await res.json()) as any;
      if (data.success && data.product) {
        setProduct(data.product);
      } else {
        throw new Error(data.error || "Failed to load product details.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to load product information.");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (criteria: keyof typeof scores, val: number) => {
    setScores(prev => ({ ...prev, [criteria]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!productId) return;

    setSubmitting(true);
    try {
      const payload = {
        product_id: productId,
        reviewer_name: reviewerName.trim(),
        reviewer_type: reviewerType,
        assessment_date: new Date().toISOString().split("T")[0],
        score_taste_aroma: scores.taste_aroma,
        score_texture_quality: scores.texture_quality,
        score_packaging_appeal: scores.packaging_appeal,
        score_price_believability: scores.price_believability,
        score_usage_occasion: scores.usage_occasion,
        score_repeat_purchase: scores.repeat_purchase,
        reviewer_decision: decision,
        tasting_notes: tastingNotes.trim()
      };

      const res = await fetch(`${WORKER_URL}/api/brand-launchpad/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Submission failed: ${errText}`);
      }

      const data = (await res.json()) as any;
      if (data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.error || "Failed to save review");
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit evaluation. Please check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-slate-100/70 text-zinc-900 font-sans flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto flex flex-col gap-4">
        {/* Brand Top Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B57D0]/10 text-[#0B57D0] text-xs font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" /> HSG Global Brand Launchpad
          </div>
          <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">Product Taste Evaluation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Sensory & Commercial Tasting Scorecard</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-[#0B57D0]" />
            <span className="text-xs font-semibold text-zinc-600">Loading Product Information...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && (
          <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm text-center flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-rose-600" />
            <h3 className="text-sm font-bold text-zinc-900">Evaluation Unavailable</h3>
            <p className="text-xs text-zinc-600">{errorMsg}</p>
          </div>
        )}

        {/* Success Confirmation State */}
        {submitted && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-950">Thank You, {reviewerName}!</h2>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto">
                Your sensory taste scorecard for <strong>{product?.product_name || "this product"}</strong> has been recorded successfully.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 w-full text-xs text-zinc-700">
              <div className="flex justify-between font-semibold py-0.5">
                <span>Total Score:</span>
                <span className="text-[#0B57D0] font-bold">{totalScore} / 30 PTS</span>
              </div>
              <div className="flex justify-between font-semibold py-0.5">
                <span>Recommendation:</span>
                <span>{decision}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setReviewerName("");
                setTastingNotes("");
              }}
              className="mt-2 text-xs text-[#0B57D0] font-semibold hover:underline"
            >
              Submit Another Review
            </button>
          </div>
        )}

        {/* Main Review Form */}
        {!loading && !errorMsg && !submitted && product && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4 text-xs">
            {/* Full-Width 1:1 Product Photo Slider Container */}
            <div className="flex flex-col gap-2">
              <div
                className="w-full aspect-square rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden relative shadow-xs select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {images.length > 0 ? (
                  <div
                    className="w-full h-full flex transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${activePhotoIdx * 100}%)` }}
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center bg-white">
                        <img
                          src={img}
                          alt={`${product.product_name} - Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Package className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs font-semibold text-zinc-400">No Product Photo</span>
                  </div>
                )}

                {/* Navigation Arrows for Multiple Images */}
                {images.length > 1 && (
                  <>
                    {activePhotoIdx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIdx((prev) => Math.max(0, prev - 1));
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-md"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}

                    {activePhotoIdx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIdx((prev) => Math.min(images.length - 1, prev + 1));
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-md"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}

                    {/* Pagination Dots */}
                    <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none">
                      {images.map((_, dotIdx) => (
                        <span
                          key={dotIdx}
                          className={`h-1.5 rounded-full transition-all ${
                            activePhotoIdx === dotIdx ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Multi-photo 1:1 Thumbnail Strip */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                        activePhotoIdx === idx
                          ? "border-[#0B57D0] shadow-xs scale-102"
                          : "border-slate-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta Header */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D3E3FD] text-[#041E49] mb-1">
                {product.brand_name || "Brand Principal"}
              </span>
              <h3 className="text-base font-bold text-zinc-950">{product.product_name}</h3>
              <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                {product.sku && <span>SKU: {product.sku}</span>}
                {product.pack_size && <span>Pack: {product.pack_size}</span>}
                <span className="font-semibold text-emerald-700">Target RSP: ${Number(product.rsp || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Reviewer Details (Name Only - Role Removed) */}
            <div>
              <label className="font-bold text-zinc-800 block mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="e.g. Chef Alex Tan / Sarah Lim"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
              />
            </div>

            {/* 6 Criteria Scoring */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-zinc-950">Sensory Criteria (1 - 5)</span>
                <span className="text-[11px] text-zinc-500 font-medium">1 = Poor, 5 = Excellent</span>
              </div>

              {[
                { key: "taste_aroma" as const, title: "1. Taste & Aroma", desc: "Flavor balance, authenticity, aroma, and aftertaste." },
                { key: "texture_quality" as const, title: "2. Texture & Quality", desc: "Mouthfeel, crunchiness, consistency, premium feel." },
                { key: "packaging_appeal" as const, title: "3. Packaging Appeal", desc: "Visual shelf stand-out, clarity, ease of opening." },
                { key: "price_believability" as const, title: "4. Price Believability", desc: `Perceived value vs RSP ($${Number(product.rsp || 0).toFixed(2)}).` },
                { key: "usage_occasion" as const, title: "5. Usage Occasion", desc: "Clear daily consumption or gifting moment." },
                { key: "repeat_purchase" as const, title: "6. Repeat Purchase Intent", desc: "Likelihood of buying again or becoming a staple." }
              ].map((crit) => {
                const currentVal = scores[crit.key];
                return (
                  <div key={crit.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-800">{crit.title}</span>
                      <span className="font-bold text-[#0B57D0]">{currentVal} / 5</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">{crit.desc}</p>
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleScoreChange(crit.key, num)}
                          className={`py-2 rounded-lg font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1 ${
                            currentVal === num
                              ? "bg-[#0B57D0] text-white shadow-xs scale-102"
                              : "bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100"
                          }`}
                        >
                          <Star className={`w-3 h-3 ${currentVal === num ? "fill-white" : "text-amber-400 fill-amber-400"}`} />
                          <span>{num}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tasting Notes */}
            <div>
              <label className="font-bold text-zinc-800 block mb-1">Tasting Notes & Observations</label>
              <textarea
                rows={2}
                value={tastingNotes}
                onChange={(e) => setTastingNotes(e.target.value)}
                placeholder="Share flavor comments, texture observations, or suggested improvements..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
              />
            </div>

            {/* Recommendation Decision */}
            <div>
              <label className="font-bold text-zinc-800 block mb-1">Overall Recommendation</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: "Proceed", label: "Proceed (Market Test)" },
                  { val: "With Conditions", label: "With Conditions" },
                  { val: "Pause", label: "Pause / Refine" },
                  { val: "Reject", label: "Do Not Proceed" }
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setDecision(d.val as any)}
                    className={`p-2 rounded-xl text-center font-semibold text-xs transition-all ${
                      decision === d.val
                        ? "bg-[#0B57D0] text-white shadow-xs"
                        : "bg-slate-50 border border-slate-200 text-zinc-700 hover:bg-slate-100"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full py-3 px-4 rounded-xl bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-sm cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Scorecard...</span>
                </>
              ) : (
                <>
                  <span>Submit Scorecard</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-zinc-400 py-2">
          HSG Global Internal Bridge System • Product Sensory Validation Portal
        </div>
      </div>
    </div>
  );
}
