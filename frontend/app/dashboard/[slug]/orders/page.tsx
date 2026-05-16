"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, ShoppingCart, Eye, CheckCircle, Trash2, AlertTriangle } from "lucide-react";
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
  status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";
  paymentMethod?: string;
  createdAt: string;
  customer?: { name: string; email?: string } | null;
  createdBy?: { name: string };
  orderItems?: { id: string; quantity: number; unitPrice: number; subtotal?: number; product: { name: string; sku?: string } }[];
}

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary" | "info"> = {
  COMPLETED: "success",
  PENDING: "warning",
  APPROVED: "info",
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
  const canManage = ["OWNER", "MANAGER"].includes(user?.role || "");
  const [approveTarget, setApproveTarget] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try { await api.patch(`/api/orders/${approveTarget.id}/status`, { status: "APPROVED" }); fetchOrders(); setApproveTarget(null); }
    catch { setError("Failed to approve order."); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try { await api.delete(`/api/orders/${deleteTarget.id}`); fetchOrders(); setDeleteTarget(null); }
    catch { setError("Failed to delete order."); }
    finally { setActionLoading(false); }
  };

  const fetchOrders = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) p.set("status", statusFilter);
    api.get(`/api/orders?${p}`)
      .then((r) => { setOrders(r.data.orders || []); setTotal(r.data.total || 0); })
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search by order # or customer..." className="pl-9 w-full sm:w-60" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
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
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
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
                  <tr key={order.id} onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer">
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
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {order.status === "PENDING" && canManage && (
                          <button onClick={() => setApproveTarget(order)} title="Approve order"
                            className="text-gray-400 hover:text-green-600 transition-colors">
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button onClick={() => setSelectedOrder(order)} className="text-gray-400 hover:text-[#0a0a0a] transition-colors" title="View order">
                          <Eye size={16} />
                        </button>
                        {canManage && (
                          <button onClick={() => setDeleteTarget(order)} title="Delete order"
                            className="text-gray-400 hover:text-[#DE1010] transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </motion.div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {Math.ceil(total / 20)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </motion.div>

      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchOrders(); }} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdated={fetchOrders} />}
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />

      {/* Approve confirmation modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setApproveTarget(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <h3 className="font-bold text-[#0a0a0a] mb-1">Approve order?</h3>
            <p className="text-gray-500 text-sm mb-5">Order <span className="font-semibold">{approveTarget.orderNumber}</span> will be marked as approved and sent to logistics.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setApproveTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? "Approving..." : "Yes, approve"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-[#DE1010]" />
            </div>
            <h3 className="font-bold text-[#0a0a0a] mb-1">Delete order?</h3>
            <p className="text-gray-500 text-sm mb-5">Order <span className="font-semibold">{deleteTarget.orderNumber}</span> will be permanently deleted. This cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-[#DE1010] hover:bg-red-700 text-white" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? "Deleting..." : "Yes, delete"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
