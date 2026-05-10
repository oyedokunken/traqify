"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Users, Trash2, AlertTriangle, ShoppingBag, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatDate, getInitials } from "@/lib/utils";
import { useForm } from "react-hook-form";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  source?: "MANUAL" | "PURCHASE";
  createdAt: string;
  _count?: { orders: number };
}

export default function CustomersPage({ params }: { params: { slug: string } }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ name: string; email: string; phone: string; address: string }>();

  const fetchCustomers = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) p.set("search", search);
    api.get(`/api/customers?${p}`)
      .then((r) => { const d = r.data; setCustomers(Array.isArray(d) ? d : d.customers || []); setTotal(typeof d.total === "number" ? d.total : (Array.isArray(d) ? d.length : 0)); })
      .catch(() => setError("Failed to load customers."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { fetchCustomers(); }, [search, page]);

  const onSubmit = async (data: any) => {
    try {
      await api.post("/api/customers", data);
      reset();
      setShowAdd(false);
      fetchCustomers();
    } catch (err: any) { setError(err.response?.data?.error || "Failed to add customer."); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/customers/${deleteTarget.id}`);
      setCustomers((c) => c.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { setError("Failed to delete customer."); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <Topbar title="Customers" slug={params.slug} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search customers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={16} />Add customer</Button>
        </div>

        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
          >
            <h3 className="font-semibold text-[#0a0a0a] mb-4">Add customer</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full name</Label>
                <Input className="mt-1.5" placeholder="Customer name" {...register("name", { required: true })} />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input className="mt-1.5" type="email" placeholder="customer@email.com" {...register("email")} />
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input className="mt-1.5" placeholder="+234..." {...register("phone")} />
              </div>
              <div>
                <Label>Address (optional)</Label>
                <Input className="mt-1.5" placeholder="Customer address" {...register("address")} />
              </div>
              <div className="col-span-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowAdd(false); reset(); }}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add customer"}</Button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-24">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No customers yet</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Contact</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden sm:table-cell">Source</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Orders</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Added</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0a0a0a]">{c.name}</p>
                          {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <p className="text-sm text-gray-600">{c.email || "-"}</p>
                      <p className="text-xs text-gray-400">{c.phone || ""}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {c.source === "PURCHASE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100">
                          <ShoppingBag size={9} /> Auto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          <UserPlus size={9} /> Manual
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{c._count?.orders ?? 0}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setDeleteTarget(c)} className="text-gray-300 hover:text-[#DE1010] transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-[#DE1010]" />
            </div>
            <h3 className="font-bold text-[#0a0a0a] mb-1">Remove customer?</h3>
            <p className="text-gray-500 text-sm mb-5"><span className="font-semibold">{deleteTarget.name}</span> and all their data will be permanently removed.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-[#DE1010] hover:bg-red-700 text-white" onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? "Removing..." : "Yes, remove"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
