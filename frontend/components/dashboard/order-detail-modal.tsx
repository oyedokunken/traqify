"use client";

import { useState } from "react";
import { X, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  customer?: { name: string; email?: string; phone?: string } | null;
  createdBy?: { name: string };
  orderItems?: { id: string; quantity: number; unitPrice: number; subtotal?: number; product: { name: string; sku?: string } }[];
}

interface Props { order: Order; onClose: () => void; onUpdated: () => void }

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  COMPLETED: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
};

export function OrderDetailModal({ order, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const canManage = ["OWNER", "MANAGER"].includes(user?.role || "");

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      await api.patch(`/api/orders/${order.id}/status`, { status });
      onUpdated();
      onClose();
    } catch {
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-[#0a0a0a]">{order.orderNumber}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[order.status] || "secondary"}>
              {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
            </Badge>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {order.customer && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
              <p className="font-medium text-[#0a0a0a] text-sm">{order.customer.name}</p>
              {order.customer.email && <p className="text-xs text-gray-400">{order.customer.email}</p>}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {order.orderItems?.map((item, i) => (
                    <tr key={i} className="px-4">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0a0a0a]">{item.product.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal || item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-sm">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-[#0a0a0a]">{formatCurrency(order.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}

          <div className="flex gap-2">
            {order.paymentMethod && (
              <Badge variant="outline" className="text-xs">{order.paymentMethod}</Badge>
            )}
            {order.createdBy && (
              <Badge variant="outline" className="text-xs">by {order.createdBy.name}</Badge>
            )}
          </div>
        </div>

        {canManage && order.status !== "CANCELLED" && (
          <div className="flex justify-between gap-3 p-6 border-t border-gray-100">
            <Button variant="outline" size="sm" className="text-[#DE1010] border-red-200 hover:bg-red-50" onClick={() => updateStatus("CANCELLED")} disabled={loading}>
              Cancel order
            </Button>
            {order.status === "PENDING" && (
              <Button size="sm" onClick={() => updateStatus("COMPLETED")} disabled={loading}>
                Mark as completed
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
