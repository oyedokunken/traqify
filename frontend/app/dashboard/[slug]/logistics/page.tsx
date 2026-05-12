"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Search, MapPin, Phone, CheckCircle, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: "APPROVED" | "COMPLETED";
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  customer?: { name: string; email?: string; phone?: string; address?: string } | null;
  orderItems?: { id: string; quantity: number; unitPrice: number; product: { name: string } }[];
}

export default function LogisticsPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const { blocked } = useRoleGuard(["OWNER", "MANAGER"], `/dashboard/${params.slug}/overview`);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);
  const [deliverConfirm, setDeliverConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const canManage = ["OWNER", "MANAGER"].includes(user?.role || "");

  const fetchOrders = () => {
    setLoading(true);
    api.get(`/api/orders?status=APPROVED&page=${page}&limit=20`)
      .then((r) => { setOrders(r.data.orders); setTotal(r.data.total); })
      .catch(() => setError("Failed to load logistics orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [page]);

  const markCompleted = async (id: string) => {
    setCompleting(id);
    try {
      await api.patch(`/api/orders/${id}/status`, { status: "COMPLETED" });
      fetchOrders();
    } catch {
      setError("Failed to mark order as completed.");
    } finally {
      setCompleting(null);
    }
  };

  const filtered = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.address?.toLowerCase().includes(search.toLowerCase())
  );

  if (blocked) return null;

  return (
    <div>
      <Topbar title="Logistics" slug={params.slug} />
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search by order # or customer..." className="pl-9 w-full sm:w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={fetchOrders} className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#0a0a0a] hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
              <Truck size={14} />
              <span className="text-xs font-semibold">{total} awaiting delivery</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Truck size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders awaiting delivery</p>
            <p className="text-gray-400 text-sm mt-1">Approved orders ready for dispatch will appear here</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#0a0a0a] text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <Badge variant="info" className="text-xs">Approved</Badge>
                </div>

                {order.customer ? (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {order.customer.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <p className="text-sm font-medium text-[#0a0a0a]">{order.customer.name}</p>
                    </div>
                    {order.customer.phone && (
                      <div className="flex items-center gap-1.5 pl-9">
                        <Phone size={11} className="text-gray-400" />
                        <a href={`tel:${order.customer.phone}`} className="text-xs text-gray-600 hover:text-[#0a0a0a]">{order.customer.phone}</a>
                      </div>
                    )}
                    {order.customer.address && (
                      <div className="flex items-start gap-1.5 pl-9">
                        <MapPin size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-600">{order.customer.address}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-400 italic">Walk-in customer</p>
                  </div>
                )}

                {order.orderItems && order.orderItems.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Items</p>
                    <div className="space-y-1">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Package size={10} className="text-gray-400" />
                            <span className="text-xs text-gray-600">{item.product.name}</span>
                          </div>
                          <span className="text-xs text-gray-400">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400">Total</p>
                    <p className="text-sm font-bold text-[#0a0a0a]">{formatCurrency(order.totalAmount)}</p>
                  </div>
                  {canManage && (
                    <Button size="sm" onClick={() => setDeliverConfirm(order.id)} disabled={completing === order.id}
                      className="gap-1.5 text-xs">
                      <CheckCircle size={13} />
                      {completing === order.id ? "Updating..." : "Mark delivered"}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {Math.ceil(total / 20)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />

      <AnimatePresence>
        {deliverConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setDeliverConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <h3 className="font-bold text-[#0a0a0a] text-center text-base mb-2">Mark as delivered?</h3>
              <p className="text-sm text-gray-500 text-center mb-5">This will mark the order as completed and remove it from the logistics queue.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeliverConfirm(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={() => { const id = deliverConfirm!; setDeliverConfirm(null); markCompleted(id); }}
                  disabled={!!completing}
                  className="flex-1 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold hover:bg-black/80 transition-colors disabled:opacity-50">
                  {completing ? "Updating..." : "Yes, mark delivered"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
