"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Warehouse, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface InventoryItem {
  productId: string;
  quantity: number;
  lowStockAlert: number;
  product: { id: string; name: string; sku: string; productCategory?: { name: string } | null };
}

export default function InventoryPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ quantity: string; lowStockAlert: string }>({ quantity: "", lowStockAlert: "" });
  const [saving, setSaving] = useState(false);

  const canEdit = ["OWNER", "MANAGER"].includes(user?.role || "");

  useEffect(() => {
    api.get("/api/categories").then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  const fetchInventory = () => {
    api.get("/api/inventory")
      .then((r) => setItems(r.data))
      .catch(() => setError("Failed to load inventory."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInventory(); }, []);

  const startEdit = (item: InventoryItem) => {
    setEditing(item.productId);
    setEditValues({ quantity: String(item.quantity), lowStockAlert: String(item.lowStockAlert) });
  };

  const saveEdit = async (productId: string) => {
    setSaving(true);
    try {
      await api.patch(`/api/inventory/${productId}`, {
        quantity: parseInt(editValues.quantity),
        lowStockAlert: parseInt(editValues.lowStockAlert),
      });
      setEditing(null);
      fetchInventory();
    } catch { setError("Failed to update stock."); }
    finally { setSaving(false); }
  };

  const filtered = items.filter((i) => {
    const matchSearch =
      i.product.name.toLowerCase().includes(search.toLowerCase()) ||
      i.product.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || i.product.productCategory?.name === categoryFilter;
    const isOut = i.quantity === 0;
    const isLow = !isOut && i.quantity <= i.lowStockAlert;
    const isIn  = !isOut && !isLow;
    const matchStock =
      !stockFilter ||
      (stockFilter === "in" && isIn) ||
      (stockFilter === "low" && isLow) ||
      (stockFilter === "out" && isOut);
    return matchSearch && matchCategory && matchStock;
  });

  return (
    <div>
      <Topbar title="Inventory" slug={params.slug} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search inventory..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">All stock levels</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          {(search || categoryFilter || stockFilter) && (
            <button onClick={() => { setSearch(""); setCategoryFilter(""); setStockFilter(""); }}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Warehouse size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No inventory records</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Product</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">SKU</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Category</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Stock</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Low alert</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => {
                  const isLow = item.quantity <= item.lowStockAlert;
                  const isEditing = editing === item.productId;
                  return (
                    <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-[#0a0a0a]">{item.product.name}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">{item.product.sku}</td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {item.product.productCategory?.name ? <Badge variant="outline" className="text-xs">{item.product.productCategory.name}</Badge> : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            className="w-20 h-8 text-sm"
                            value={editValues.quantity}
                            onChange={(e) => setEditValues((v) => ({ ...v, quantity: e.target.value }))}
                          />
                        ) : (
                          <span className={`text-sm font-semibold ${isLow ? "text-[#DE1010]" : "text-[#0a0a0a]"}`}>
                            {item.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            className="w-20 h-8 text-sm"
                            value={editValues.lowStockAlert}
                            onChange={(e) => setEditValues((v) => ({ ...v, lowStockAlert: e.target.value }))}
                          />
                        ) : (
                          <span className="text-sm text-gray-500">{item.lowStockAlert}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={isLow ? "warning" : "success"} className="text-xs">
                          {item.quantity === 0 ? "Out of stock" : isLow ? "Low stock" : "In stock"}
                        </Badge>
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-7 px-3 text-xs" onClick={() => saveEdit(item.productId)} disabled={saving}>
                                {saving ? "..." : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => setEditing(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-[#DE1010] transition-colors">
                              <Edit2 size={15} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
        <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
      </motion.div>
    </div>
  );
}
