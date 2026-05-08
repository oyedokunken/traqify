"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Copy, Eye, EyeOff, ExternalLink, CheckCircle, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function StorePage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const storeUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/store/${params.slug}`;

  const fetchStore = () => {
    api.get(`/api/organizations/${params.slug}`).then((r) => setStoreData(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchStore(); }, []);

  const isPublished = storeData?.storePublished ?? false;

  const togglePublish = async () => {
    setToggling(true);
    try {
      await api.patch(`/api/organizations/${params.slug}`, { storePublished: !isPublished });
      fetchStore();
    } catch { setError("Failed to update store status."); }
    finally { setToggling(false); }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setLogoError('Only JPG, PNG, or WebP allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Image must be under 2MB.'); return; }
    setLogoUploading(true); setLogoError("");
    try {
      const fd = new FormData(); fd.append('logo', file);
      const r = await api.post(`/api/organizations/${params.slug}/upload-logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setStoreData((prev: any) => ({ ...prev, logoUrl: r.data.url }));
    } catch { setLogoError('Failed to upload logo.'); }
    finally { setLogoUploading(false); e.target.value = ''; }
  };

  return (
    <div>
      <Topbar title="Store" slug={params.slug} />
      <div className="p-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPublished ? "bg-green-50" : "bg-gray-100"}`}>
                  <Globe size={20} className={isPublished ? "text-green-600" : "text-gray-400"} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0a0a0a]">Store status</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{isPublished ? "Your store is live and accepting orders" : "Your store is currently offline"}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-gray-400"}`} />
                {isPublished ? "Published" : "Unpublished"}
              </div>
            </div>

            <Button onClick={togglePublish} disabled={toggling || loading || user?.role === "CASHIER"}
              className={`gap-2 ${isPublished ? "bg-gray-800 hover:bg-gray-900" : "bg-[#DE1010] hover:bg-red-700"}`}>
              {isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
              {toggling ? "Updating..." : isPublished ? "Unpublish store" : "Publish store"}
            </Button>
            {error && <p className="text-xs text-[#DE1010] mt-2">{error}</p>}
          </div>

          {/* Store URL */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-[#0a0a0a] mb-1">Store URL</h3>
            <p className="text-xs text-gray-400 mb-4">Share this URL with your customers to let them browse and order products.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-600 font-mono truncate">{storeUrl}</div>
              <button onClick={copyUrl} className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${copied ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                {copied ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 flex items-center gap-1.5 transition-colors">
                <ExternalLink size={14} /> Visit
              </a>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-[#0a0a0a] mb-1">Store logo</h3>
            <p className="text-xs text-gray-400 mb-4">This logo appears on your public store page. JPG, PNG or WebP, max 2MB.</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {storeData?.logoUrl ? (
                  <img src={storeData.logoUrl} alt="Store logo" className="w-full h-full object-contain" />
                ) : (
                  <ImagePlus size={20} className="text-gray-300" />
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} disabled={logoUploading || user?.role === 'CASHIER'} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-black/80 transition-colors">
                    {logoUploading ? 'Uploading...' : storeData?.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </span>
                </label>
                {logoError && <p className="text-xs text-[#DE1010] mt-1.5">{logoError}</p>}
              </div>
            </div>
          </div>

          {/* What customers see */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-[#0a0a0a] mb-4">What customers can do on your store</h3>
            <div className="space-y-3">
              {[
                { title: "Browse products", sub: "View all published products with categories, images and pricing." },
                { title: "Add to cart", sub: "Customers can add multiple products to a cart before checkout." },
                { title: "Guest checkout", sub: "No account required. Customers fill their details and complete an order." },
                { title: "Paystack payment", sub: "Secure card payments powered by Paystack." },
                { title: "Auto-logged as customer", sub: "Every guest checkout automatically creates a customer record in your dashboard." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0a0a0a]">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}