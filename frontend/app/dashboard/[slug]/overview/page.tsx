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
  BarChart2,
  Globe,
  Archive,
  UserCheck,
  Cog,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import {
  AreaChart, Area,
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
  const [revChart, setRevChart] = useState<ChartPoint[]>([]);
  const [ordChart, setOrdChart] = useState<ChartPoint[]>([]);
  const [customerChart, setCustomerChart] = useState<{ date: string; customers: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [revPeriod, setRevPeriod] = useState(30);
  const [ordPeriod, setOrdPeriod] = useState(30);
  const [custPeriod, setCustPeriod] = useState(30);
  const [revLoading, setRevLoading] = useState(false);
  const [ordLoading, setOrdLoading] = useState(false);
  const [custLoading, setCustLoading] = useState(false);
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

  useEffect(() => {
    api.get("/api/reports/overview").then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get("/api/reports/revenue-chart?period=30").then((r) => { setRevChart(r.data || []); setOrdChart(r.data || []); }).catch(() => {});
    api.get("/api/reports/customer-chart?period=30").then((r) => setCustomerChart(r.data || [])).catch(() => {});
  }, []);

  // Refresh charts when user returns to the tab
  useEffect(() => {
    const onFocus = () => {
      api.get("/api/reports/overview").then((r) => setData(r.data)).catch(() => {});
      api.get(`/api/reports/revenue-chart?period=${revPeriod}`).then((r) => setRevChart(r.data || [])).catch(() => {});
      api.get(`/api/reports/revenue-chart?period=${ordPeriod}`).then((r) => setOrdChart(r.data || [])).catch(() => {});
      api.get(`/api/reports/customer-chart?period=${custPeriod}`).then((r) => setCustomerChart(r.data || [])).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [revPeriod, ordPeriod, custPeriod]);

  const changeRevPeriod = async (p: number) => {
    setRevPeriod(p); setRevLoading(true);
    try { const r = await api.get(`/api/reports/revenue-chart?period=${p}`); setRevChart(r.data || []); } catch {} finally { setRevLoading(false); }
  };
  const changeOrdPeriod = async (p: number) => {
    setOrdPeriod(p); setOrdLoading(true);
    try { const r = await api.get(`/api/reports/revenue-chart?period=${p}`); setOrdChart(r.data || []); } catch {} finally { setOrdLoading(false); }
  };
  const changeCustPeriod = async (p: number) => {
    setCustPeriod(p); setCustLoading(true);
    try { const r = await api.get(`/api/reports/customer-chart?period=${p}`); setCustomerChart(r.data || []); } catch {} finally { setCustLoading(false); }
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
      <div className="p-4 md:p-6">
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

          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">Revenue (last {revPeriod} days)</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {[7, 30, 60, 90].map((opt) => (
                      <button key={opt} onClick={() => changeRevPeriod(opt)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${revPeriod === opt ? "bg-[#0a0a0a] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {opt}d
                      </button>
                    ))}
                    {revLoading && <span className="w-3.5 h-3.5 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
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
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#10B981" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">Order growth (last {ordPeriod} days)</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {[7, 30, 60, 90].map((opt) => (
                      <button key={opt} onClick={() => changeOrdPeriod(opt)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${ordPeriod === opt ? "bg-[#0a0a0a] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {opt}d
                      </button>
                    ))}
                    {ordLoading && <span className="w-3.5 h-3.5 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={ordChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.20} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={fmtChartDate} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} domain={[0, "auto"]} allowDecimals={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} labelFormatter={fmtChartDate} formatter={(v: number) => [v, "Orders"]} />
                    <Area type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} fill="url(#ordGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#10B981" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">Customer growth (last {custPeriod} days)</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {[7, 30, 60, 90].map((opt) => (
                      <button key={opt} onClick={() => changeCustPeriod(opt)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${custPeriod === opt ? "bg-[#0a0a0a] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {opt}d
                      </button>
                    ))}
                    {custLoading && <span className="w-3.5 h-3.5 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={customerChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={fmtChartDate} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} domain={[0, "auto"]} allowDecimals={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} labelFormatter={fmtChartDate} formatter={(v: number) => [v, "Customers"]} />
                    <Area type="monotone" dataKey="customers" stroke="#10B981" strokeWidth={2} fill="url(#custGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#10B981" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={fadeUp} className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { href: `/dashboard/${params.slug}/products`, icon: Package, label: "Products", desc: "Manage your product catalog", color: "bg-blue-50", iconColor: "text-blue-600" },
                    { href: `/dashboard/${params.slug}/orders`, icon: ShoppingCart, label: "Orders", desc: "View and process orders", color: "bg-green-50", iconColor: "text-green-600" },
                    { href: `/dashboard/${params.slug}/customers`, icon: Users, label: "Customers", desc: "Manage customer records", color: "bg-purple-50", iconColor: "text-purple-600" },
                    { href: `/dashboard/${params.slug}/inventory`, icon: Archive, label: "Inventory", desc: "Track and adjust stock", color: "bg-amber-50", iconColor: "text-amber-600" },
                    { href: `/dashboard/${params.slug}/reports`, icon: BarChart2, label: "Reports", desc: "Download financial reports", color: "bg-indigo-50", iconColor: "text-indigo-600" },
                    { href: `/dashboard/${params.slug}/store`, icon: Globe, label: "Storefront", desc: "Configure your public store", color: "bg-red-50", iconColor: "text-[#DE1010]" },
                    { href: `/dashboard/${params.slug}/staff`, icon: UserCheck, label: "Staff", desc: "Manage team members", color: "bg-teal-50", iconColor: "text-teal-600" },
                    { href: `/dashboard/${params.slug}/settings`, icon: Cog, label: "Settings", desc: "Account and org settings", color: "bg-gray-100", iconColor: "text-gray-600" },
                  ].map(({ href, icon: Icon, label, desc, color, iconColor }) => (
                    <a key={href} href={href}
                      className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
                      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={17} className={iconColor} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0a0a0a] leading-tight">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
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
