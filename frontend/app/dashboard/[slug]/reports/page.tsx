"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopProduct {
  productId: string;
  _sum: { quantity: number; subtotal: number };
  product?: { name: string; sku: string; category?: string };
}

interface SalesReport {
  orders: any[];
  totalRevenue: number;
  totalItems: number;
  orderCount: number;
}

export default function ReportsPage({ params }: { params: { slug: string } }) {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const fetchReports = () => {
    setLoading(true);
    Promise.all([
      api.get(`/api/reports/sales?from=${from}&to=${to}`),
      api.get("/api/reports/top-products?limit=10"),
    ]).then(([s, tp]) => {
      setSales(s.data);
      setTopProducts(tp.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const chartData = topProducts.slice(0, 8).map((p) => ({
    name: p.product?.name?.split(" ").slice(0, 2).join(" ") || "Unknown",
    revenue: p._sum.subtotal || 0,
    qty: p._sum.quantity || 0,
  }));

  return (
    <div>
      <Topbar title="Reports" slug={params.slug} />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>From</Label>
            <Input type="date" className="mt-1.5 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" className="mt-1.5 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={fetchReports}>Apply filter</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-gray-500 font-medium mb-1">Total revenue</p>
                  <p className="text-2xl font-bold text-[#0a0a0a]">{formatCurrency(sales?.totalRevenue || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-gray-500 font-medium mb-1">Orders completed</p>
                  <p className="text-2xl font-bold text-[#0a0a0a]">{sales?.orderCount || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-gray-500 font-medium mb-1">Items sold</p>
                  <p className="text-2xl font-bold text-[#0a0a0a]">{sales?.totalItems || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top 8 products by revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No data for this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#DE1010" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Order history</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!sales?.orders?.length ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No orders in this period</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Order</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Customer</th>
                        <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Date</th>
                        <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sales.orders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-sm font-medium">{order.orderNumber}</td>
                          <td className="px-5 py-3 text-sm text-gray-600 hidden md:table-cell">{order.customer?.name || "Walk-in"}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">{formatDate(order.createdAt)}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-right">{formatCurrency(order.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
