"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Search, Plus, X, CheckCircle2,
  Clock, XCircle, RefreshCw, DollarSign, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  method: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    customer?: { name: string } | null;
  } | null;
}

interface PaymentStats {
  total: { count: number; amount: number };
  pending: { count: number; amount: number };
  completed: { count: number; amount: number };
  failed: { count: number; amount: number };
  refunded: { count: number; amount: number };
}

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   icon: Clock,         cls: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", icon: CheckCircle2,  cls: "bg-green-100 text-green-700" },
  FAILED:    { label: "Failed",    icon: XCircle,       cls: "bg-red-100 text-red-700" },
  REFUNDED:  { label: "Refunded",  icon: RefreshCw,     cls: "bg-gray-100 text-gray-600" },
};

export default function PaymentsPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;

  const [selected, setSelected] = useState<Payment | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";

  const { register, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<{ amount: string; method: string; reference: string; notes: string; status: string }>();

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) p.set("search", search);
    if (statusFilter) p.set("status", statusFilter);
    api.get(`/api/payments?${p}`)
      .then((r) => {
        setPayments(r.data.payments || []);
        setTotal(r.data.total || 0);
        if (r.data.stats) setStats(r.data.stats);
      })
      .catch(() => setError("Failed to load payments."))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const onAddSubmit = async (data: any) => {
    try {
      await api.post("/api/payments", { ...data, amount: parseFloat(data.amount) });
      reset();
      setShowAdd(false);
      fetchPayments();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create payment.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/api/payments/${id}`, { status });
      fetchPayments();
      if (selected?.id === id) setSelected((p) => p ? { ...p, status: status as Payment["status"] } : null);
    } catch { setError("Failed to update payment."); }
    finally { setUpdatingId(null); }
  };

  const summaryCards = stats ? [
    { label: "Total payments",  value: formatCurrency(stats.total.amount),     sub: `${stats.total.count} transactions`,     icon: DollarSign, bg: "bg-[#0a0a0a]", fg: "text-white", subFg: "text-gray-400" },
    { label: "Completed",       value: formatCurrency(stats.completed.amount),  sub: `${stats.completed.count} transactions`, icon: CheckCircle2, bg: "bg-green-50", fg: "text-green-700", subFg: "text-green-500" },
    { label: "Pending",         value: formatCurrency(stats.pending.amount),    sub: `${stats.pending.count} awaiting`,       icon: Clock, bg: "bg-amber-50", fg: "text-amber-700", subFg: "text-amber-500" },
    { label: "Failed / Refunded", value: formatCurrency(stats.failed.amount + stats.refunded.amount), sub: `${stats.failed.count + stats.refunded.count} transactions`, icon: XCircle, bg: "bg-red-50", fg: "text-red-700", subFg: "text-red-400" },
  ] : [];

  return (
    <div>
      <Topbar title="Payments" slug={params.slug} />
      <div className="p-6">

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats ? summaryCards.map((card) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border border-gray-200 p-5 ${card.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-semibold uppercase tracking-wide ${card.subFg}`}>{card.label}</p>
                <card.icon size={16} className={card.subFg} />
              </div>
              <p className={`text-2xl font-bold ${card.fg}`}>{card.value}</p>
              <p className={`text-xs mt-1 ${card.subFg}`}>{card.sub}</p>
            </motion.div>
          )) : Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-5 animate-pulse bg-gray-50 h-28" />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input placeholder="Search reference, method..." className="pl-9"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          {canManage && (
            <Button onClick={() => setShowAdd(true)} className="gap-2 ml-auto">
              <Plus size={15} /> Record payment
            </Button>
          )}
        </div>


        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-24">
            <CreditCard size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No payments yet</p>
            <p className="text-gray-400 text-sm mt-1">Payments recorded here will appear in this list</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Reference</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Order</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Method</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((pmt) => {
                  const cfg = STATUS_CONFIG[pmt.status];
                  return (
                    <tr key={pmt.id} onClick={() => setSelected(pmt)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-[#0a0a0a] font-mono">
                          {pmt.reference || pmt.id.slice(-8).toUpperCase()}
                        </p>
                        {pmt.order?.customer?.name && (
                          <p className="text-xs text-gray-400">{pmt.order.customer.name}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">
                        {pmt.order ? `#${pmt.order.orderNumber}` : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-[#0a0a0a]">
                        {formatCurrency(pmt.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
                          <cfg.icon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                        {pmt.method || <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                        {formatDate(pmt.createdAt)}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">
                    {selected.reference || selected.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-2xl font-bold text-[#0a0a0a]">{formatCurrency(selected.amount)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[selected.status].cls}`}>
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                </div>
                {selected.method && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method</span>
                    <span className="font-medium text-[#0a0a0a]">{selected.method}</span>
                  </div>
                )}
                {selected.order && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order</span>
                    <span className="font-medium text-[#0a0a0a]">#{selected.order.orderNumber}</span>
                  </div>
                )}
                {selected.order?.customer?.name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium text-[#0a0a0a]">{selected.order.customer.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-700">{formatDate(selected.createdAt)}</span>
                </div>
                {selected.notes && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-gray-400 text-xs mb-1">Notes</p>
                    <p className="text-gray-700">{selected.notes}</p>
                  </div>
                )}
              </div>

              {canManage && selected.status === "PENDING" && (
                <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
                    disabled={updatingId === selected.id}
                    onClick={() => updateStatus(selected.id, "COMPLETED")}>
                    <CheckCircle2 size={13} /> Mark Completed
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={updatingId === selected.id}
                    onClick={() => updateStatus(selected.id, "FAILED")}>
                    <XCircle size={13} /> Mark Failed
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record payment modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
            onClick={() => { setShowAdd(false); reset(); }}>
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-[#0a0a0a]">Record payment</h3>
                <button onClick={() => { setShowAdd(false); reset(); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (NGN) *</Label>
                    <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("amount", { required: true })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("status")}>
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
                  <div>
                    <Label>Payment method</Label>
                    <Input className="mt-1.5" placeholder="e.g. Paystack, Cash, Transfer" {...register("method")} />
                  </div>
                  <div>
                    <Label>Reference</Label>
                    <Input className="mt-1.5" placeholder="Transaction reference" {...register("reference")} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input className="mt-1.5" placeholder="Optional notes" {...register("notes")} />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowAdd(false); reset(); }}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save payment"}</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
