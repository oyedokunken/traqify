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
  ExternalLink,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import {
  ComposedChart, Area, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface OverviewData {
  totalRevenue: number;
  monthRevenue: number;
  revenueGrowth: number | null;
  totalOrders: number;
  monthOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
  storePublished: boolean;
  orgSlug: string;
}

interface ChartPoint {
  date: string;
  revenue: number;
  orders: number;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const fmtChartDate = (raw: string) => {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export default function OverviewPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [customerChart, setCustomerChart] = useState<{ date: string; customers: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [period, setPeriod] = useState(30);
  const [now, setNow] = useState(new Date());
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [storeError, setStoreError] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // First-time welcome: shown once ever (localStorage)
  // Welcome back: shown once per login session (sessionStorage)
  useEffect(() => {
    if (!user?.organizationId) return;
    const firstKey = `traqify_welcomed_${params.slug}`;
    const sessionKey = `traqify_session_${params.slug}`;
    if (!localStorage.getItem(firstKey)) {
      setShowWelcome(true);
      localStorage.setItem(firstKey, "1");
    } else if (!sessionStorage.getItem(sessionKey)) {
      setShowWelcomeBack(true);
      sessionStorage.setItem(sessionKey, "1");
    }
  }, [params.slug, user?.organizationId]);

  const fetchAll = (p: number) => {
    api.get("/api/reports/overview").then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get(`/api/reports/revenue-chart?period=${p}`).then((r) => setChart(r.data || [])).catch(() => {});
    api.get(`/api/reports/customer-chart?period=${p}`).then((r) => setCustomerChart(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    fetchAll(period);
  }, []);

  // Refresh charts when user returns to the tab (e.g. after adding orders/customers)
  useEffect(() => {
    const onFocus = () => fetchAll(period);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [period]);

  const changePeriod = async (p: number) => {
    setPeriod(p);
    setChartLoading(true);
    try {
      const [overviewData, chartData, customerData] = await Promise.all([
        api.get("/api/reports/overview"),
        api.get(`/api/reports/revenue-chart?period=${p}`),
        api.get(`/api/reports/customer-chart?period=${p}`),
      ]);
      setData(overviewData.data);
      setChart(chartData.data || []);
      setCustomerChart(customerData.data || []);
    } catch {} finally { setChartLoading(false); }
  };

  const openStorefront = () => {
    if (!data?.storePublished) { setStoreError(true); return; }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    window.open(`${siteUrl}/store/${params.slug}`, "_blank");
  };

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
      sub: data?.revenueGrowth === null
        ? "New this month"
        : `${(data?.revenueGrowth ?? 0) >= 0 ? "+" : ""}${data?.revenueGrowth ?? 0}% from last month`,
      icon: DollarSign,
      trend: (data?.revenueGrowth ?? 0) >= 0 ? "up" : "down",
    },
    {
      title: "Orders this month",
      value: data?.monthOrders?.toLocaleString() || "0",
      sub: `${(data?.totalOrders ?? 0).toLocaleString()} total orders`,
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
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: tz });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <Topbar title="Overview" slug={params.slug} />
      <div className="p-6">
        {/* Greeting + clock + Storefront button */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#0a0a0a]">{greeting}, {user?.name?.split(" ")[0] || "there"}</h2>
            <p className="text-sm text-gray-500 mt-0.5 tabular-nums">{dateStr} &nbsp;&middot;&nbsp; {timeStr}</p>
            <p className="text-sm text-gray-400">{tz.replace(/_/g, " ")}</p>
          </div>
          <button onClick={openStorefront}
            className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] hover:bg-black/80 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 self-start">
            <ExternalLink size={14} /> Open Storefront
          </button>
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

          {/* Period filter */}
          <motion.div variants={fadeUp} className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500 font-medium">Period:</span>
            {[{ label: "7 days", value: 7 }, { label: "30 days", value: 30 }, { label: "60 days", value: 60 }, { label: "90 days", value: 90 }].map((opt) => (
              <button key={opt.value} onClick={() => changePeriod(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  period === opt.value ? "bg-[#0a0a0a] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {opt.label}
              </button>
            ))}
            {chartLoading && <span className="w-4 h-4 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />}
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Revenue (last {period} days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DE1010" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#DE1010" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={fmtChartDate} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} domain={[0, "auto"]} tickFormatter={(v) => `\u20a6${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={fmtChartDate}
                      formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="none" fill="url(#revGrad)" />
                    <Bar dataKey="revenue" fill="#DE1010" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Order growth (last {period} days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DE1010" stopOpacity={0.10} />
                        <stop offset="95%" stopColor="#DE1010" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={fmtChartDate} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} domain={[0, "auto"]} allowDecimals={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} labelFormatter={fmtChartDate} formatter={(v: number) => [v, "Orders"]} />
                    <Area type="monotone" dataKey="orders" stroke="none" fill="url(#ordGrad)" />
                    <Bar dataKey="orders" fill="#DE1010" opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} name="Orders" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Customer growth (last {period} days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={customerChart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0a0a0a" stopOpacity={0.10} />
                        <stop offset="95%" stopColor="#0a0a0a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={fmtChartDate} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} domain={[0, "auto"]} allowDecimals={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} labelFormatter={fmtChartDate} formatter={(v: number) => [v, "Customers"]} />
                    <Area type="monotone" dataKey="customers" stroke="none" fill="url(#custGrad)" />
                    <Bar dataKey="customers" fill="#0a0a0a" opacity={0.80} radius={[3, 3, 0, 0]} maxBarSize={16} name="Customers" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Store not published error modal */}
      <AnimatePresence>
        {storeError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setStoreError(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle size={24} className="text-[#DE1010]" />
              </div>
              <h3 className="font-bold text-[#0a0a0a] text-center mb-2">Storefront not published</h3>
              <p className="text-gray-500 text-sm text-center mb-5">Your storefront is currently offline. Go to the Storefront page to publish it before sharing with customers.</p>
              <div className="flex gap-3">
                <button onClick={() => setStoreError(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
                <a href={`/dashboard/${params.slug}/store`}
                  className="flex-1 py-2.5 bg-[#DE1010] text-white rounded-xl text-sm font-medium text-center hover:bg-red-700 transition-colors">Go to Storefront</a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome back modal (every login) */}
      <AnimatePresence>
        {showWelcomeBack && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#DE1010] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
                    <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                    <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[#0a0a0a] text-sm">Welcome back, {user?.name?.split(" ")[0] || "there"}</p>
                  <p className="text-xs text-gray-400">{user?.organization?.name || "Your workspace"}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">Good to see you again. Your dashboard is up to date.</p>
              <button
                onClick={() => setShowWelcomeBack(false)}
                className="w-full px-4 py-2 bg-[#0a0a0a] text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-time welcome modal */}
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
              {user?.role === "OWNER" ? (
                <>
                  <p className="text-gray-500 text-sm leading-relaxed mb-1">
                    Hi {user?.name?.split(" ")[0] || "there"}, your workspace is ready. You can now add products, invite your team, and manage your store from this dashboard.
                  </p>
                  <p className="text-gray-400 text-xs mb-6">
                    {user?.organization?.name || "Your organization"} is set up and live.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm leading-relaxed mb-1">
                    Hi {user?.name?.split(" ")[0] || "there"}, you have joined <strong className="text-[#0a0a0a]">{user?.organization?.name || "the organization"}</strong> as a <strong className="text-[#0a0a0a]">{user?.role === "MANAGER" ? "Manager" : user?.role === "AUDITOR" ? "Auditor" : "Cashier"}</strong>.
                  </p>
                  <p className="text-gray-400 text-xs mb-1">
                    {user?.role === "MANAGER" && "You can manage products, orders, customers, inventory, staff, and access reports."}
                    {user?.role === "AUDITOR" && "You can view orders, inventory, audit logs, and access reports."}
                    {user?.role === "CASHIER" && "You can view and process orders and products."}
                  </p>
                  <p className="text-gray-400 text-xs mb-6">Your dashboard is ready to go.</p>
                </>
              )}
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
