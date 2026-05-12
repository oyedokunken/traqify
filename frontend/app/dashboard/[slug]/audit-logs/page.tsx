"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, CheckSquare, Square, Eye, EyeOff, Filter, ChevronLeft, ChevronRight, X, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatDateTime, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  isRead: boolean;
  createdAt: string;
  user?: { id: string; name?: string; email: string; avatarUrl?: string };
}

const ACTION_OPTIONS = ["all", "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "INVITE"];
const ENTITY_OPTIONS = ["all", "Product", "Order", "Customer", "User", "Organization", "ProductCategory", "Inventory", "Report", "Review", "Newsletter", "StaffInvite"];

const actionColor: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700 border-green-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  LOGIN: "bg-gray-100 text-gray-600 border-gray-200",
  LOGOUT: "bg-gray-100 text-gray-600 border-gray-200",
  EXPORT: "bg-amber-50 text-amber-700 border-amber-200",
  INVITE: "bg-purple-50 text-purple-700 border-purple-200",
};

const LIMIT = 20;

export default function AuditLogsPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const { blocked } = useRoleGuard(["OWNER", "AUDITOR"], `/dashboard/${params.slug}/overview`);
  const isManager = user?.role === "OWNER" || user?.role === "MANAGER";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params_q = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      ...(actionFilter !== "all" && { action: actionFilter }),
      ...(entityFilter !== "all" && { entity: entityFilter }),
      ...(readFilter === "unread" && { isRead: "false" }),
      ...(readFilter === "read" && { isRead: "true" }),
      ...(dateFrom && dateTo && { from: dateFrom, to: dateTo }),
    });
    api.get(`/api/audit-logs?${params_q}`)
      .then((r) => {
        setLogs(r.data.logs);
        setTotal(r.data.total);
        setUnreadCount(r.data.unreadCount ?? 0);
        setSelected(new Set());
      })
      .catch(() => setError("Failed to load audit logs."))
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityFilter, readFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.details || "").toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.user?.name || "").toLowerCase().includes(q) ||
      (l.user?.email || "").toLowerCase().includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markSelected = async (isRead: boolean) => {
    if (!selected.size) return;
    const count = selected.size;
    setMarking(true);
    try {
      const r = await api.patch("/api/audit-logs/mark-read", { ids: Array.from(selected), isRead });
      setUnreadCount(r.data.unreadCount ?? 0);
      setLogs((prev) => prev.map((l) => selected.has(l.id) ? { ...l, isRead } : l));
      setSelected(new Set());
      setSuccessMsg(`${count} notification${count !== 1 ? "s" : ""} marked ${isRead ? "read" : "unread"}.`);
    } catch { setError("Failed to update read status."); }
    finally { setMarking(false); }
  };

  const markAll = async (isRead: boolean) => {
    setMarking(true);
    try {
      const r = await api.patch("/api/audit-logs/mark-read", { all: true, isRead });
      const count = r.data.count ?? logs.length;
      setUnreadCount(r.data.unreadCount ?? 0);
      setLogs((prev) => prev.map((l) => ({ ...l, isRead })));
      setSelected(new Set());
      setSuccessMsg(`${count} notification${count !== 1 ? "s" : ""} marked ${isRead ? "read" : "unread"}.`);
    } catch { setError("Failed to update read status."); }
    finally { setMarking(false); }
  };

  const resetFilters = () => {
    setActionFilter("all"); setEntityFilter("all");
    setReadFilter("all"); setDateFrom(""); setDateTo("");
    setPage(1);
  };
  const hasActiveFilters = actionFilter !== "all" || entityFilter !== "all" || readFilter !== "all" || dateFrom || dateTo;

  if (blocked) return null;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <Topbar title="Audit Logs" slug={params.slug} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search logs..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${hasActiveFilters ? "bg-[#DE1010] text-white border-[#DE1010]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Filter size={14} />
            Filters {hasActiveFilters && <span className="bg-white/20 text-xs px-1.5 rounded-full">active</span>}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            {unreadCount > 0 && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                {unreadCount} unread
              </span>
            )}
            <p className="text-sm text-gray-400">{total.toLocaleString()} entries</p>
          </div>
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1 block">Action</label>
                <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#DE1010]">
                  {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a === "all" ? "All actions" : a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1 block">Entity</label>
                <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#DE1010]">
                  {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e === "all" ? "All entities" : e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1 block">Status</label>
                <select value={readFilter} onChange={(e) => { setReadFilter(e.target.value as any); setPage(1); }}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#DE1010]">
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Date range</label>
                <div className="flex gap-1.5">
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#DE1010]" />
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#DE1010]" />
                </div>
              </div>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="col-span-full flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1">
                  <X size={12} /> Reset all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selected.size > 0 && isManager && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 bg-[#0a0a0a] text-white rounded-xl px-4 py-2.5 mb-4">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <div className="flex-1" />
              <button onClick={() => markSelected(true)} disabled={marking}
                className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                <Eye size={13} /> Mark read
              </button>
              <button onClick={() => markSelected(false)} disabled={marking}
                className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                <EyeOff size={13} /> Mark unread
              </button>
              <button onClick={() => setSelected(new Set())} className="ml-1 p-1 rounded hover:bg-white/10">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mark all buttons (owner/manager) */}
        {isManager && logs.length > 0 && selected.size === 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => markAll(true)} disabled={marking}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors disabled:opacity-40">
              <Eye size={12} /> Mark all read
            </button>
            <span className="text-gray-300">·</span>
            <button onClick={() => markAll(false)} disabled={marking}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors disabled:opacity-40">
              <EyeOff size={12} /> Mark all unread
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No audit logs found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {isManager && (
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                        {allSelected ? <CheckSquare size={15} className="text-[#DE1010]" /> : <Square size={15} />}
                      </button>
                    </th>
                  )}
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-2">
                    <span className="sr-only">Status</span>
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Staff</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Entity</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden lg:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log) => (
                  <tr key={log.id}
                    onClick={() => router.push(`/dashboard/${params.slug}/audit-logs/${log.id}`)}
                    className={`cursor-pointer transition-colors ${selected.has(log.id) ? "bg-red-50" : log.isRead ? "hover:bg-gray-50" : "bg-blue-50/30 hover:bg-blue-50/50"}`}>
                    {isManager && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleOne(log.id)} className="text-gray-400 hover:text-[#DE1010]">
                          {selected.has(log.id) ? <CheckSquare size={15} className="text-[#DE1010]" /> : <Square size={15} />}
                        </button>
                      </td>
                    )}
                    <td className="px-2 py-3.5">
                      {!log.isRead && <span className="inline-block w-2 h-2 rounded-full bg-[#DE1010]" />}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {getInitials(log.user?.name || log.user?.email || "?")}
                        </div>
                        <span className={`text-sm hidden sm:block ${log.isRead ? "text-gray-500" : "text-[#0a0a0a] font-medium"}`}>
                          {log.user?.name || log.user?.email || "System"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${actionColor[log.action] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border border-gray-200 bg-gray-50 text-gray-600">
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm max-w-xs">
                      <p className={`truncate ${log.isRead ? "text-gray-500" : "text-gray-700"}`}>{log.details || log.action}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages} &middot; {total.toLocaleString()} entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
                <ChevronLeft size={14} /> Prev
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${pg === page ? "bg-[#0a0a0a] text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                    {pg}
                  </button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />

      {/* Success modal for mark read/unread */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setSuccessMsg("")}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <h3 className="font-bold text-[#0a0a0a] mb-1">Done</h3>
              <p className="text-gray-500 text-sm mb-5">{successMsg}</p>
              <button onClick={() => setSuccessMsg("")}
                className="w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors">
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
