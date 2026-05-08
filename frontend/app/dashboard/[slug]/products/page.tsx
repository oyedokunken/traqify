"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit, Trash2, MoreHorizontal, Package } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  category?: string;
  imageUrl?: string;
  isActive: boolean;
  inventory?: { quantity: number; lowStockAlert: number };
  _count?: { orderItems: number };
}

export default function ProductsPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const canEdit = user?.role === "OWNER" || user?.role === "MANAGER";

  const fetchProducts = () => {
    api.get(`/api/products?search=${search}`)
      .then((r) => setProducts(r.data))
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [search]);

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
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canEdit && (
            <Button onClick={() => { setEditProduct(null); setShowModal(true); }} className="gap-2">
              <Plus size={16} />
              Add product
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
              <Button className="mt-4 gap-2" onClick={() => setShowModal(true)}>
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
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
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
                      {product.category && <Badge variant="outline" className="text-xs">{product.category}</Badge>}
                      <Badge variant={isLow ? "warning" : "success"} className="text-xs">
                        {product.inventory?.quantity ?? 0} in stock
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
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
