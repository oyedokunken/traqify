"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import { CreateOrderModal } from "@/components/dashboard/create-order-modal";
import { OrderDetailModal } from "@/components/dashboard/order-detail-modal";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  paymentMethod?: string;
  createdAt: string;
  customer?: { name: string; email?: string } | null;
  createdBy?: { name: string };
  orderItems?: { id: string; quantity: number; unitPrice: number; subtotal?: number; product: { name: string; sku?: string } }[];
}

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  COMPLETED: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
};

export default function OrdersPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const canCreate = ["OWNER", "MANAGER", "CASHIER"].includes(user?.role || "");

  const fetchOrders = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) p.set("status", statusFilter);
    api.get(`/api/orders?${p}`)
      .then((r) => { setOrders(r.data.orders); setTotal(r.data.total); })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  const filtered = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Topbar title="Orders" slug={params.slug} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search by order # or customer..." className="pl-9 w-60" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus size={16} />
              New order
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingCart size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first order from the button above</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Order</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Total</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-[#0a0a0a]">{order.orderNumber}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{order.customer?.name || <span className="text-gray-400 italic">Walk-in</span>}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">{formatDateTime(order.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-[#0a0a0a]">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant[order.status] || "secondary"} className="text-xs">
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-gray-400 hover:text-[#DE1010] transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchOrders(); }} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdated={fetchOrders} />}
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
