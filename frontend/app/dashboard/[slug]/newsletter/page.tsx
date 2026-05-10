"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Users, Search, Download, RefreshCw, Calendar, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";

interface Subscriber {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function NewsletterPage({ params }: { params: { slug: string } }) {
  const { user: _user } = useAuth();
  const { blocked } = useRoleGuard(["OWNER", "MANAGER"], `/dashboard/${params.slug}/overview`);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshModal, setRefreshModal] = useState<{ open: boolean; type: "success" | "error" }>({ open: false, type: "success" });
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionModal, setActionModal] = useState<{ open: boolean; type: "success" | "error"; msg: string }>({ open: false, type: "success", msg: "" });

  const fetchSubscribers = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await api.get("/api/newsletter/subscribers");
      setSubscribers(res.data);
      if (silent) setRefreshModal({ open: true, type: "success" });
    } catch {
      if (silent) setRefreshModal({ open: true, type: "error" });
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/newsletter/${deleteTarget.id}`);
      setSubscribers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      setActionModal({ open: true, type: "success", msg: `${deleteTarget.email} has been removed from the newsletter list.` });
    } catch (err: any) {
      setDeleteTarget(null);
      setActionModal({ open: true, type: "error", msg: err.response?.data?.error || "Failed to remove subscriber. Please try again." });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const header = "Name,Email,Subscribed On,Status\n";
    const rows = subscribers.map((s) => `"${s.name || ""}","${s.email}","${fmt(s.createdAt)}","Active"`).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  if (blocked) return null;

  return (
    <>
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
                  <th className="px-5 py-3" />
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
                    <td className="px-3 py-3.5 text-right">
                      <button onClick={() => setDeleteTarget(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#DE1010] hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
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

      {/* Confirm delete modal */}
    <AnimatePresence>
      {deleteTarget && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setDeleteTarget(null)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-[#DE1010]" />
            </div>
            <h3 className="font-bold text-[#0a0a0a] text-base text-center mb-1">Remove subscriber?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              <span className="font-medium text-[#0a0a0a]">{deleteTarget.email}</span> will be permanently removed from the newsletter list.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-[#DE1010] text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Action result modal */}
    <AnimatePresence>
      {actionModal.open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setActionModal((m) => ({ ...m, open: false }))}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${actionModal.type === "success" ? "bg-green-100" : "bg-red-50"}`}>
              {actionModal.type === "success"
                ? <CheckCircle2 size={22} className="text-green-600" />
                : <XCircle size={22} className="text-[#DE1010]" />}
            </div>
            <h3 className="font-bold text-[#0a0a0a] text-base text-center mb-2">
              {actionModal.type === "success" ? "Subscriber removed" : "Action failed"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5">{actionModal.msg}</p>
            <button onClick={() => setActionModal((m) => ({ ...m, open: false }))}
              className="w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors">
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Refresh summary modal */}
    <AnimatePresence>
      {refreshModal.open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setRefreshModal((m) => ({ ...m, open: false }))}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              refreshModal.type === "success" ? "bg-green-100" : "bg-red-50"
            }`}>
              {refreshModal.type === "success"
                ? <Mail size={22} className="text-green-600" />
                : <Mail size={22} className="text-[#DE1010]" />}
            </div>
            <h3 className="font-bold text-[#0a0a0a] text-base text-center mb-4">
              {refreshModal.type === "success" ? "Newsletter updated" : "Refresh failed"}
            </h3>
            {refreshModal.type === "success" && (
              <div className="space-y-2 mb-5">
                {([
                  ["Total subscribers", subscribers.length],
                  ["Last 7 days", subscribers.filter((s) => new Date(s.createdAt) > new Date(Date.now() - 7 * 86400000)).length],
                  ["This month", subscribers.filter((s) => { const d = new Date(s.createdAt); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-bold text-[#0a0a0a]">{val}</span>
                  </div>
                ))}
              </div>
            )}
            {refreshModal.type === "error" && (
              <p className="text-sm text-gray-500 text-center mb-5">Could not fetch subscribers. Please check your connection and try again.</p>
            )}
            <button onClick={() => setRefreshModal((m) => ({ ...m, open: false }))}
              className="w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors">
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
