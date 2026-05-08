"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Users, Search, Download, RefreshCw, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";

interface Subscriber {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function NewsletterPage({ params }: { params: { slug: string } }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubscribers = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await api.get("/api/newsletter/subscribers");
      setSubscribers(res.data);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const header = "Name,Email,Subscribed On\n";
    const rows = subscribers.map((s) => `"${s.name || ""}","${s.email}","${fmt(s.createdAt)}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "newsletter-subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Topbar title="Newsletter" slug={params.slug} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6">

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Users size={18} className="text-[#DE1010]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total subscribers</p>
                <p className="text-2xl font-bold text-[#0a0a0a]">{subscribers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Calendar size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Last 7 days</p>
                <p className="text-2xl font-bold text-[#0a0a0a]">
                  {subscribers.filter((s) => new Date(s.createdAt) > new Date(Date.now() - 7 * 86400000)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">This month</p>
                <p className="text-2xl font-bold text-[#0a0a0a]">
                  {subscribers.filter((s) => {
                    const d = new Date(s.createdAt); const n = new Date();
                    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search subscribers..." className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchSubscribers(true)} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={subscribers.length === 0}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Mail size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">{search ? "No matching subscribers" : "No subscribers yet"}</p>
              <p className="text-gray-400 text-sm mt-1">
                {search ? "Try a different search term" : "Subscribers from your landing page newsletter form will appear here"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden sm:table-cell">Subscribed</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-[#0a0a0a]">
                      {s.name || <span className="text-gray-400 italic text-xs">No name</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{s.email}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">{fmt(s.createdAt)}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Badge variant="success" className="text-[10px]">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
