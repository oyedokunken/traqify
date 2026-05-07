"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Users, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatDate, getInitials } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { motion as m } from "framer-motion";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  _count?: { orders: number };
}

export default function CustomersPage({ params }: { params: { slug: string } }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ name: string; email: string; phone: string; address: string }>();

  const fetchCustomers = () => {
    api.get(`/api/customers?search=${search}`)
      .then((r) => setCustomers(r.data))
      .catch(() => setError("Failed to load customers."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const onSubmit = async (data: any) => {
    try {
      await api.post("/api/customers", data);
      reset();
      setShowAdd(false);
      fetchCustomers();
    } catch (err: any) { setError(err.response?.data?.error || "Failed to add customer."); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    try {
      await api.delete(`/api/customers/${id}`);
      setCustomers((c) => c.filter((x) => x.id !== id));
    } catch { setError("Failed to delete customer."); }
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
                      <p className="text-sm text-gray-600">{c.email || "—"}</p>
                      <p className="text-xs text-gray-400">{c.phone || ""}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{c._count?.orders ?? 0}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleDelete(c.id, c.name)} className="text-gray-300 hover:text-[#DE1010] transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
