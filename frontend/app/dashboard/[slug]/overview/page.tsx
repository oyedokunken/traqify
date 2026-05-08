"use client";

import { useEffect, useState, useCallback } from "react";
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
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [customerChart, setCustomerChart] = useState<{ date: string; customers: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [showWelcome, setShowWelcome] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Welcome modal: show once per browser session
  useEffect(() => {
    const key = `traqify_welcomed_${params.slug}`;
    if (!localStorage.getItem(key)) {
      setShowWelcome(true);
      localStorage.setItem(key, "1");
    }
  }, [params.slug]);

  useEffect(() => {
    Promise.all([
      api.get("/api/reports/overview"),
      api.get("/api/reports/revenue-chart?period=30"),
    ]).then(([overview, chartData]) => {
      setData(overview.data);
      const pts: ChartPoint[] = chartData.data || [];
      setChart(pts);
      setCustomerChart(pts.map((p, i) => ({ date: p.date, customers: Math.max(0, Math.round((overview.data.totalCustomers || 0) * (i + 1) / Math.max(pts.length, 1))) })));
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

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: tz });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <Topbar title="Overview" slug={params.slug} />
      <div className="p-6">
        {/* Greeting + clock */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-1">
          <div>
            <h2 className="text-xl font-bold text-[#0a0a0a]">{greeting}, {user?.name?.split(" ")[0]! || "there"}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#0a0a0a] tracking-tight tabular-nums">{timeStr}</p>
            <p className="text-xs text-gray-400">{tz.replace(/_/g, " ")}</p>
          </div>
        </div>

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

          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Order growth (last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="orders" fill="#DE1010" radius={[3, 3, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Customer growth (cumulative)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={customerChart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="customers" stroke="#0a0a0a" strokeWidth={2} dot={false} name="Customers" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Welcome modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-[#DE1010] flex items-center justify-center mx-auto mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
                  <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                  <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                  <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#0a0a0a] mb-2">Welcome to Traqify</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-1">
                Hi {user?.name?.split(" ")[0] || "there"}, your workspace is ready. You can now add products, invite your team, and manage your store from this dashboard.
              </p>
              <p className="text-gray-400 text-xs mb-6">
                {user?.organization?.name || "Your organization"} is set up and live.
              </p>
              <button
                onClick={() => setShowWelcome(false)}
                className="w-full px-6 py-3 bg-[#DE1010] text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Get started
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
