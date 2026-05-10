"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Copy, Eye, EyeOff, ExternalLink, CheckCircle, ImagePlus, Package, Tag, ShoppingBag, Mail, Phone, MapPin, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";

export default function StorePage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const { blocked } = useRoleGuard(["OWNER", "MANAGER"], `/dashboard/${params.slug}/overview`);
  const [storeData, setStoreData] = useState<any>(null);
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [showPublishError, setShowPublishError] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const storeUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/store/${params.slug}`;

  const fetchStore = () =>
    api.get(`/api/organizations/${params.slug}`).then((r) => setStoreData(r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => {
    fetchStore();
    api.get(`/api/products?status=published&limit=1`).then((r) => setProductCount(r.data.total ?? 0)).catch(() => {});
    api.get(`/api/categories`).then((r) => setCategoryCount(Array.isArray(r.data) ? r.data.length : 0)).catch(() => {});
  }, []);

  const isPublished = storeData?.storePublished ?? false;

  const togglePublish = async () => {
    setToggling(true); setError("");
    const publishing = !isPublished;
    if (publishing) {
      const issues: string[] = [];
      if (!storeData?.logoUrl) issues.push("No store logo uploaded  -  upload a logo to represent your brand.");
      if (!storeData?.description) issues.push("No store description set  -  add a description in Settings.");
      if (!storeData?.email) issues.push("No business email configured  -  set it in Settings.");
      if (productCount === 0) issues.push("No published products  -  add at least one published product.");
      if (categoryCount === 0) issues.push("No product categories  -  create at least one category.");
      if (issues.length > 0) {
        setPublishErrors(issues);
        setShowPublishError(true);
        setToggling(false);
        return;
      }
    }
    try {
      await api.patch(`/api/organizations/${params.slug}`, { storePublished: publishing });
      fetchStore();
      setSuccessMsg(publishing ? "Your store is now live and accepting orders." : "Your store has been taken offline.");
      setShowSuccess(true);
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

  if (blocked) return null;

  return (
    <>
    <div>
      <Topbar title="Store" slug={params.slug} />
      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: controls */}
        <div className="xl:col-span-2">
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
        </div>{/* end left col */}

        {/* Right column: store info */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-[#0a0a0a] mb-4">Store overview</h3>
            <div className="space-y-4">
              {/* Logo  -  full-width, uncropped */}
              <div className="w-full bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden" style={{ minHeight: "80px", maxHeight: "160px" }}>
                {storeData?.logoUrl ? (
                  <img src={storeData.logoUrl} alt="Logo" className="max-w-full object-contain p-3" style={{ maxHeight: "160px" }} />
                ) : (
                  <div className="flex flex-col items-center gap-1 py-6">
                    <Globe size={28} className="text-gray-200" />
                    <p className="text-xs text-gray-400">No logo uploaded</p>
                  </div>
                )}
              </div>
              {/* Store name */}
              <p className="font-bold text-[#0a0a0a] text-base">{storeData?.name || "-"}</p>
              {/* Pills: industry + store ID */}
              <div className="flex flex-wrap gap-2">
                {storeData?.industry && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{storeData.industry}</span>
                )}
                {storeData?.id && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-gray-100 text-gray-500 border border-gray-200 select-all" title="Store ID">
                    ID: {storeData.id}
                  </span>
                )}
              </div>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                {[
                  { icon: Package, label: "Published products", value: productCount },
                  { icon: Tag, label: "Categories", value: categoryCount },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <Icon size={16} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-[#0a0a0a]">{value}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-[#0a0a0a] mb-4">Contact details</h3>
            <div className="space-y-3">
              {[
                { icon: Mail, label: "Email", value: storeData?.email },
                { icon: Phone, label: "Phone", value: storeData?.phone },
                { icon: MapPin, label: "Address", value: storeData?.address },
                { icon: Link2, label: "Website", value: storeData?.website },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">{label}</p>
                    <p className={`text-sm text-[#0a0a0a]${label !== "Address" ? " truncate" : " whitespace-normal break-words"}`}>{value || <span className="text-gray-300 italic">Not set</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description card */}
          {storeData?.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#0a0a0a] mb-2 text-sm">Store description</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{storeData.description}</p>
            </div>
          )}

          {/* Quick link to settings */}
          <p className="text-xs text-gray-400 text-center">
            Update contact details in{" "}
            <a href={`/dashboard/${params.slug}/settings`} className="text-[#DE1010] hover:underline">Settings</a>
          </p>
        </motion.div>

        </div>{/* end grid */}
      </div>
    </div>

      {/* Store toggle success modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <button onClick={() => setShowSuccess(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>
              <h3 className="font-bold text-[#0a0a0a] mb-1">Store updated</h3>
              <p className="text-gray-500 text-sm mb-5">{successMsg}</p>
              <button onClick={() => setShowSuccess(false)}
                className="w-full px-4 py-2 bg-[#0a0a0a] text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors">
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Publish validation error modal */}
      <AnimatePresence>
        {showPublishError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <X size={18} className="text-amber-600" />
                </div>
                <button onClick={() => setShowPublishError(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <h3 className="font-bold text-[#0a0a0a] mb-1">Store isn't ready to publish</h3>
              <p className="text-gray-500 text-sm mb-4">Please fix the following issues before going live:</p>
              <ul className="space-y-2 mb-5">
                {publishErrors.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-[#DE1010] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-gray-700">{issue}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowPublishError(false)}
                className="w-full px-4 py-2 bg-[#0a0a0a] text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors">
                Got it, I'll fix these
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}