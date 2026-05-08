"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Copy, Eye, EyeOff, ExternalLink, CheckCircle } from "lucide-react";
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