"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatCurrency, truncate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ProductModal } from "@/components/dashboard/product-modal";

const TYPE_LABELS: Record<string, string> = { SIMPLE: "Simple", DOWNLOADABLE: "Downloadable", VARIABLE: "Variable" };
const TYPE_VARIANTS: Record<string, "default" | "secondary" | "info" | "warning" | "outline"> = { SIMPLE: "secondary", DOWNLOADABLE: "info", VARIABLE: "warning" };

interface Product {
  id: string; name: string; sku: string; price: number; comparePrice?: number;
  category?: string; imageUrl?: string; imageUrls?: string[]; isActive: boolean; status?: string;
  productType?: string;
  productCategory?: { id: string; name: string };
  inventory?: { quantity: number; lowStockAlert: number }; _count?: { orderItems: number };
}

export default function ProductsPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const canEdit = user?.role === "OWNER" || user?.role === "MANAGER";

  useEffect(() => { api.get("/api/categories").then((r) => setCategories(r.data)).catch(() => {}); }, []);

  const fetchProducts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("productType", typeFilter);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    api.get(`/api/products?${params}`)
      .then((r) => { const d = r.data; setProducts(Array.isArray(d) ? d : d.products || []); setTotal(typeof d.total === "number" ? d.total : (Array.isArray(d) ? d.length : 0)); })
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter, typeFilter]);
  useEffect(() => { fetchProducts(); }, [search, categoryFilter, statusFilter, typeFilter, page]);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string, name: string) => setDeleteTarget({ id, name });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/products/${deleteTarget.id}`);
      setProducts((p) => p.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { setError("Failed to delete product."); }
  };

  return (
    <div>
      <Topbar title="Products" slug={params.slug} />
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search products..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All types</option>
              <option value="SIMPLE">Simple</option>
              <option value="DOWNLOADABLE">Downloadable</option>
              <option value="VARIABLE">Variable</option>
            </select>
          </div>
          {canEdit && (
            <Button onClick={() => {
              if (categories.length === 0) { setError("You need at least one product category before adding products. Go to Categories to create one."); return; }
              router.push(`/dashboard/${params.slug}/products/new`);
            }} className="gap-2">
              <Plus size={16} /> Add product
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No products yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first product to get started</p>
            {canEdit && (
              <Button className="mt-4 gap-2" onClick={() => {
                if (categories.length === 0) { setError("You need at least one product category before adding products. Go to Categories to create one."); return; }
                setEditProduct(null); setShowModal(true);
              }}>
                <Plus size={15} /> Add product
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {products.map((product) => {
              const isLow = product.inventory && product.inventory.quantity <= product.inventory.lowStockAlert;
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="h-40 bg-gray-100 flex items-center justify-center relative">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <Package size={36} className="text-gray-300" />
                    )}
                    {!product.isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      </div>
                    )}
                    {canEdit && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditProduct(product); setShowModal(true); }}
                          className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm hover:bg-gray-50"
                        >
                          <Edit size={13} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm hover:bg-red-50"
                        >
                          <Trash2 size={13} className="text-[#DE1010]" />
                        </button>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[#0a0a0a] text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>
                      </div>
                      <p className="font-bold text-[#0a0a0a] text-sm whitespace-nowrap">{formatCurrency(product.price)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      {(product.productCategory?.name || product.category) && <Badge variant="outline" className="text-xs">{product.productCategory?.name || product.category}</Badge>}
                      <Badge variant={isLow ? "warning" : "success"} className="text-xs">
                        {product.inventory?.quantity ?? 0} in stock
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <Badge variant={product.status === "published" ? "success" : "secondary"} className="text-[10px]">
                        {product.status === "published" ? "Published" : "Draft"}
                      </Badge>
                      {product.productType && (
                        <Badge variant={TYPE_VARIANTS[product.productType] || "outline"} className="text-[10px]">
                          {TYPE_LABELS[product.productType] || product.productType}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}

        {total > LIMIT && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {Math.ceil(total / LIMIT)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editProduct}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchProducts(); }}
        />
      )}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-bold text-[#0a0a0a] mb-2">Delete product?</h3>
              <p className="text-gray-500 text-sm mb-5">
                This will permanently delete <span className="font-medium text-[#0a0a0a]">{deleteTarget.name}</span>. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-[#DE1010] text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
