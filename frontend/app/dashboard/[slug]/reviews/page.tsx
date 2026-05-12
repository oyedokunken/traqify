"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, CheckCircle, XCircle, Trash2, MessageSquare, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  customerName: string;
  customerEmail?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  product: { id: string; name: string; imageUrl?: string };
  order?: { id: string; orderNumber: string } | null;
}

const statusVariant: Record<string, string> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={13} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"} />
    ))}
  </div>
);

export default function ReviewsPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const { blocked } = useRoleGuard(["OWNER", "MANAGER"], `/dashboard/${params.slug}/overview`);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [moderateConfirm, setModerateConfirm] = useState<{ id: string; action: "approve" | "reject" } | null>(null);

  const fetchReviews = async (initial = false) => {
    setLoading(true);
    try {
      const [filteredRes, allRes] = await Promise.all([
        api.get(`/api/reviews?status=${statusFilter}&limit=50`),
        initial ? api.get(`/api/reviews?limit=200`) : Promise.resolve(null),
      ]);
      setReviews(filteredRes.data.reviews);
      setTotal(filteredRes.data.total);
      if (initial && allRes) setAllReviews(allRes.data.reviews);
    } catch { setError("Failed to load reviews."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(statusFilter === "PENDING"); }, [statusFilter]);

  const confirmModerate = (id: string, action: "approve" | "reject") => setModerateConfirm({ id, action });

  const moderate = async (id: string, action: "approve" | "reject") => {
    setActionId(id);
    setModerateConfirm(null);
    try {
      await api.patch(`/api/reviews/${id}/moderate`, { action });
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch { setError("Action failed."); }
    finally { setActionId(null); }
  };

  const remove = async (id: string) => {
    setActionId(id);
    try {
      await api.delete(`/api/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch { setError("Delete failed."); }
    finally { setActionId(null); }
  };

  const filtered = reviews.filter((r) =>
    !search ||
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.product.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.comment || "").toLowerCase().includes(search.toLowerCase())
  );

  const avgRating = allReviews.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : "0.0";
  const pendingCount = allReviews.filter((r) => r.status === "PENDING").length;
  const approvedCount = allReviews.filter((r) => r.status === "APPROVED").length;

  if (blocked) return null;

  return (
    <div>
      <Topbar title="Reviews" slug={params.slug} />
      <div className="p-4 md:p-6">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mb-4 bg-red-50 border border-red-200 text-[#DE1010] text-sm px-4 py-3 rounded-lg">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {allReviews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Total reviews</p>
              <p className="text-2xl font-bold text-[#0a0a0a]">{allReviews.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Avg rating</p>
              <div className="flex items-center gap-1.5">
                <p className="text-2xl font-bold text-amber-500">{avgRating}</p>
                <Star size={16} className="fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
              <p className="text-xs text-amber-600 font-medium mb-1">Pending review</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-100 p-4">
              <p className="text-xs text-green-700 font-medium mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-0">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                statusFilter === s
                  ? "border-[#DE1010] text-[#DE1010]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search by customer or product..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-gray-500">{filtered.length} review{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <MessageSquare size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No {statusFilter.toLowerCase()} reviews</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {r.product.imageUrl ? (
                      <img src={r.product.imageUrl} alt={r.product.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        <MessageSquare size={14} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0a0a0a] truncate">{r.product.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.customerName}
                        {r.customerEmail && <span className="text-gray-400"> · {r.customerEmail}</span>}
                      </p>
                      {r.order && (
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <ShoppingBag size={9} /> Order #{r.order.orderNumber}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Stars rating={r.rating} />
                        <Badge variant={statusVariant[r.status] as any} className="text-[10px]">{r.status}</Badge>
                        <span className="text-[10px] text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                          disabled={actionId === r.id} onClick={() => confirmModerate(r.id, "approve")}>
                          <CheckCircle size={13} /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-[#DE1010] border-red-200 hover:bg-red-50"
                          disabled={actionId === r.id} onClick={() => confirmModerate(r.id, "reject")}>
                          <XCircle size={13} /> Reject
                        </Button>
                      </>
                    )}
                    {r.status === "REJECTED" && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                        disabled={actionId === r.id} onClick={() => confirmModerate(r.id, "approve")}>
                        <CheckCircle size={13} /> Approve
                      </Button>
                    )}
                    {r.status === "APPROVED" && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-[#DE1010] border-red-200 hover:bg-red-50"
                        disabled={actionId === r.id} onClick={() => confirmModerate(r.id, "reject")}>
                        <XCircle size={13} /> Reject
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-[#DE1010]"
                      disabled={actionId === r.id} onClick={() => remove(r.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {moderateConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setModerateConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${moderateConfirm!.action === "approve" ? "bg-green-50" : "bg-red-50"}`}>
                {moderateConfirm!.action === "approve"
                  ? <CheckCircle size={24} className="text-green-600" />
                  : <XCircle size={24} className="text-[#DE1010]" />}
              </div>
              <h3 className="font-bold text-[#0a0a0a] text-center text-base mb-2">
                {moderateConfirm!.action === "approve" ? "Approve this review?" : "Reject this review?"}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                {moderateConfirm!.action === "approve"
                  ? "This review will be published and visible to all customers."
                  : "This review will be hidden from your public store."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setModerateConfirm(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={() => moderate(moderateConfirm!.id, moderateConfirm!.action)}
                  disabled={!!actionId}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    moderateConfirm!.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-[#DE1010] hover:bg-red-700"
                  }`}>
                  {actionId ? "Processing..." : moderateConfirm!.action === "approve" ? "Yes, approve" : "Yes, reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
