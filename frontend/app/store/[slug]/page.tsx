"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollToTop } from "@/components/shared/scroll-to-top";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  inventory?: { quantity: number };
}

interface Org {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  website?: string;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

export default function PublicStorePage({ params }: { params: { slug: string } }) {
  const [org, setOrg] = useState<Org | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/api/organizations/${params.slug}/store`)
      .then((r) => { setOrg(r.data.org); setProducts(r.data.products); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const categories = products.map((p) => p.category).filter((c): c is string => !!c).filter((c, i, a) => a.indexOf(c) === i);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !category || p.category === category;
    return matchSearch && matchCategory;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Store not found</h1>
        <p className="text-gray-500 text-sm">This store does not exist or is no longer available.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#DE1010] flex items-center justify-center text-white text-xs font-bold">
                {org?.name?.[0]}
              </div>
            )}
            <h1 className="font-bold text-[#0a0a0a]">{org?.name}</h1>
          </div>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
            Powered by Traqify
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search products..."
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategory("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!category ? "bg-[#0a0a0a] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === category ? "" : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${cat === category ? "bg-[#0a0a0a] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No products found</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
          >
            {filtered.map((product) => {
              const inStock = (product.inventory?.quantity ?? 0) > 0;
              return (
                <motion.div key={product.id} variants={fadeUp} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-44 bg-gray-100 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={36} className="text-gray-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-[#0a0a0a] text-sm mb-0.5 truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#0a0a0a]">{formatCurrency(product.price)}</p>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <p className="text-xs text-gray-400 line-through">{formatCurrency(product.comparePrice)}</p>
                        )}
                      </div>
                      <Badge variant={inStock ? "success" : "destructive"} className="text-xs">
                        {inStock ? `${product.inventory?.quantity} left` : "Out of stock"}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      <footer className="border-t border-gray-200 mt-12 py-8 text-center text-xs text-gray-400">
        <p>{org?.name} &bull; Powered by <Link href="/" className="text-gray-600 hover:text-[#0a0a0a]">Traqify</Link></p>
      </footer>

      <ScrollToTop />
    </div>
  );
}
