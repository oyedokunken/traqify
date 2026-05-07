"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatDateTime, getInitials } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; name?: string; email: string; avatarUrl?: string };
}

const actionVariant: Record<string, any> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "destructive",
};

export default function AuditLogsPage({ params }: { params: { slug: string } }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = () => {
    setLoading(true);
    api.get(`/api/audit-logs?page=${page}&limit=50`)
      .then((r) => { setLogs(r.data.logs); setTotal(r.data.total); })
      .catch(() => setError("Failed to load audit logs."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const filtered = logs.filter((l) =>
    l.description?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity?.toLowerCase().includes(search.toLowerCase()) ||
    l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Topbar title="Audit Logs" slug={params.slug} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Filter by action, entity or staff..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-gray-400">{total.toLocaleString()} total entries</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No audit logs yet</p>
            <p className="text-gray-400 text-sm mt-1">Actions performed in your organization will appear here</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Staff</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Entity</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {getInitials(log.user?.name || log.user?.email || "?")}
                        </div>
                        <span className="text-sm text-[#0a0a0a] hidden sm:block">
                          {log.user?.name || log.user?.email || "System"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={actionVariant[log.action] || "secondary"} className="text-xs">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 max-w-xs">
                      <p className="truncate">{log.description}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {total > 50 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="px-3 py-1.5 text-sm text-gray-500">
              {page} / {Math.ceil(total / 50)}
            </span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
