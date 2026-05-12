"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Tag, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";
import { useForm } from "react-hook-form";

interface Category { id: string; name: string; slug: string; description?: string; createdAt: string; _count?: { products: number }; }

export default function CategoriesPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const { blocked } = useRoleGuard(["OWNER", "MANAGER"], `/dashboard/${params.slug}/overview`);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const canManage = ["OWNER","MANAGER"].includes(user?.role || "");

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ name: string; description: string }>();

  const fetchCats = () => {
    api.get("/api/categories").then((r) => setCats(r.data)).catch(() => setError("Failed to load categories.")).finally(() => setLoading(false));
  };
  useEffect(() => { fetchCats(); }, []);

  const openAdd = () => { setEditCat(null); reset({ name: "", description: "" }); setShowModal(true); };
  const openEdit = (c: Category) => { setEditCat(c); reset({ name: c.name, description: c.description || "" }); setShowModal(true); };

  const onSubmit = async (data: { name: string; description: string }) => {
    try {
      if (editCat) { await api.patch(`/api/categories/${editCat.id}`, data); }
      else { await api.post("/api/categories", data); }
      fetchCats(); setShowModal(false);
    } catch (err: any) { setError(err.response?.data?.error || "Failed to save category."); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/api/categories/${deleteTarget.id}`); fetchCats(); setDeleteTarget(null); }
    catch { setError("Failed to delete category."); }
  };

  const filtered = cats.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  if (blocked) return null;

  return (
    <div>
      <Topbar title="Product Categories" slug={params.slug} />
      <div className="p-4 md:p-6">
        {error && <p className="text-sm text-[#DE1010] bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search categories..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canManage && (
            <Button onClick={openAdd} className="gap-2"><Plus size={16} /> Add category</Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Tag size={16} className="text-[#DE1010]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0a0a0a] text-sm">{c.name}</h3>
                      <p className="text-xs text-gray-400">{c._count?.products ?? 0} product{(c._count?.products ?? 0) !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#0a0a0a] transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-[#DE1010] transition-colors"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                {c.description && <p className="text-xs text-gray-400 mt-3 leading-relaxed line-clamp-2">{c.description}</p>}
                <p className="text-[10px] text-gray-300 mt-2">Created {formatDate(c.createdAt)}</p>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 py-24 text-center">
                <Tag size={28} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No categories yet. Add your first category to organise your products.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-bold text-[#0a0a0a] mb-4">{editCat ? "Edit category" : "New category"}</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Category name</Label>
                  <Input className="mt-1.5" placeholder="e.g. Electronics" {...register("name", { required: true })} />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <textarea className="mt-1.5 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Brief description..." {...register("description")} />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? "Saving..." : editCat ? "Save changes" : "Create"}</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-bold text-[#0a0a0a] mb-2">Delete category?</h3>
              <p className="text-gray-500 text-sm mb-5">Deleting <strong>{deleteTarget.name}</strong> will not delete the products in it, but they will lose their category association.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-[#DE1010] text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}