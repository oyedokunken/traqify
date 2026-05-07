"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface OverviewData {
  totalRevenue: number;
  monthRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  monthOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
}

interface ChartPoint {
  date: string;
  revenue: number;
  orders: number;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function OverviewPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/reports/overview"),
      api.get("/api/reports/revenue-chart?period=30"),
    ]).then(([overview, chartData]) => {
      setData(overview.data);
      setChart(chartData.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Topbar title="Overview" slug={params.slug} />
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Revenue this month",
      value: formatCurrency(data?.monthRevenue || 0),
      sub: `${data?.revenueGrowth && data.revenueGrowth >= 0 ? "+" : ""}${data?.revenueGrowth}% from last month`,
      icon: DollarSign,
      trend: (data?.revenueGrowth || 0) >= 0 ? "up" : "down",
    },
    {
      title: "Orders this month",
      value: data?.monthOrders?.toLocaleString() || "0",
      sub: `${data?.totalOrders?.toLocaleString()} total orders`,
      icon: ShoppingCart,
      trend: "up",
    },
    {
      title: "Active products",
      value: data?.totalProducts?.toLocaleString() || "0",
      sub: `${data?.lowStockCount || 0} low stock alerts`,
      icon: Package,
      trend: (data?.lowStockCount || 0) > 0 ? "down" : "up",
    },
    {
      title: "Customers",
      value: data?.totalCustomers?.toLocaleString() || "0",
      sub: "Total registered customers",
      icon: Users,
      trend: "up",
    },
  ];

  return (
    <div>
      <Topbar title="Overview" slug={params.slug} />
      <div className="p-6">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-[#0a0a0a]">{stat.value}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${stat.trend === "up" ? "text-green-600" : "text-[#DE1010]"}`}>
                        {stat.trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {stat.sub}
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.trend === "up" ? "bg-green-50" : "bg-red-50"}`}>
                      <stat.icon size={18} className={stat.trend === "up" ? "text-green-600" : "text-[#DE1010]"} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {data && data.lowStockCount > 0 && (
            <motion.div variants={fadeUp} className="mb-6">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>
                  <span className="font-semibold">{data.lowStockCount}</span> product{data.lowStockCount !== 1 ? "s are" : " is"} running low on stock.{" "}
                  <a href={`/dashboard/${params.slug}/inventory`} className="underline font-medium">View inventory</a>
                </span>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Revenue (last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DE1010" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#DE1010" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#DE1010" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
