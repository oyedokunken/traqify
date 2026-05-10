"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, User, Clock, Monitor, Globe,
  CheckCircle, Circle, Tag, Hash,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { getInitials } from "@/lib/utils";

interface AuditLogDetail {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isRead: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN:  "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  PUBLISH:"bg-amber-100 text-amber-700",
  UNPUBLISH:"bg-orange-100 text-orange-700",
};

export default function AuditLogDetailPage({ params }: { params: { slug: string; id: string } }) {
  const router = useRouter();
  const [log, setLog] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/audit-logs/${params.id}`)
      .then((r) => setLog(r.data))
      .catch(() => setError("Audit log not found or you don't have access."))
      .finally(() => setLoading(false));
  }, [params.id]);

  const ROLE_LABELS: Record<string, string> = {
    OWNER: "Owner", MANAGER: "Manager", CASHIER: "Cashier", AUDITOR: "Auditor",
  };

  const actionColor = log ? (ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600") : "";

  return (
    <div>
      <Topbar title="Audit Log Detail" slug={params.slug} />
      <div className="p-4 sm:p-6 w-full">
        <button
          onClick={() => router.push(`/dashboard/${params.slug}/audit-logs`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0a0a0a] mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Audit Logs
        </button>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{error}</p>
            <button onClick={() => router.back()} className="mt-4 text-sm text-[#DE1010] hover:underline">
              Go back
            </button>
          </div>
        ) : log ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Header card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionColor}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-semibold text-[#0a0a0a]">{log.entity}</span>
                    </div>
                    {log.entityId && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {log.entityId}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  {log.isRead ? (
                    <><CheckCircle size={13} className="text-green-500" /> Read</>
                  ) : (
                    <><Circle size={13} className="text-gray-300" /> Unread</>
                  )}
                </div>
              </div>

              {log.details && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {log.details}
                </div>
              )}
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Performed by */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <User size={12} /> Performed by
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
                    {log.user.avatarUrl ? (
                      <img src={log.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#DE1010] text-white text-xs font-bold flex items-center justify-center">
                        {getInitials(log.user.name || log.user.email)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0a0a0a] truncate">{log.user.name || "-"}</p>
                    <p className="text-xs text-gray-400 truncate">{log.user.email}</p>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                      {ROLE_LABELS[log.user.role] || log.user.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Clock size={12} /> Timestamp
                </p>
                <p className="text-sm font-medium text-[#0a0a0a]">
                  {new Date(log.createdAt).toLocaleDateString("en-GB", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(log.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
                  })}
                </p>
              </div>

              {/* Entity info */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Tag size={12} /> Entity
                </p>
                <p className="text-sm font-medium text-[#0a0a0a]">{log.entity}</p>
                {log.entityId && (
                  <p className="text-xs text-gray-400 font-mono mt-1 break-all">{log.entityId}</p>
                )}
              </div>

              {/* Log ID */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Hash size={12} /> Log ID
                </p>
                <p className="text-xs text-gray-500 font-mono break-all">{log.id}</p>
              </div>
            </div>

            {/* Network info */}
            {(log.ipAddress || log.userAgent) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Network info</p>
                <div className="space-y-2">
                  {log.ipAddress && (
                    <div className="flex items-start gap-2.5">
                      <Globe size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400">IP Address</p>
                        <p className="text-sm text-gray-700 font-mono">{log.ipAddress}</p>
                      </div>
                    </div>
                  )}
                  {log.userAgent && (
                    <div className="flex items-start gap-2.5">
                      <Monitor size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400">User Agent</p>
                        <p className="text-xs text-gray-500 break-all leading-relaxed">{log.userAgent}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
