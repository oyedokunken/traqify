"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Shield, ShieldOff, Trash2, Key, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatDate, getInitials, ROLE_LABELS } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/use-role-guard";
import { useForm } from "react-hook-form";

interface StaffMember {
  id: string; name?: string; email: string; role: string; isActive: boolean;
  avatarUrl?: string; lastLoginAt?: string; createdAt: string; invitedBy?: { name: string };
}
const roleVariant: Record<string, any> = { OWNER: "default", MANAGER: "info", CASHIER: "secondary", AUDITOR: "outline" };

type ConfirmAction = { type: "access" | "remove" | "reset"; memberId: string; name: string; isActive?: boolean } | null;

export default function StaffPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const { blocked } = useRoleGuard(["OWNER", "MANAGER"], `/dashboard/${params.slug}/overview`);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ email: string; role: string }>();

  const canManage = ["OWNER", "MANAGER"].includes(user?.role || "");
  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4000); };

  const fetchStaff = () => {
    api.get("/api/staff").then((r) => setStaff(r.data)).catch(() => setError("Failed to load staff.")).finally(() => setLoading(false));
  };
  useEffect(() => { fetchStaff(); }, []);

  const onInvite = async (data: { email: string; role: string }) => {
    try {
      await api.post("/api/staff/invite", data);
      reset(); setShowInviteModal(false); flash(`Invitation sent to ${data.email}.`);
    } catch (err: any) { setError(err.response?.data?.error || "Failed to send invitation."); }
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === "access") { await api.patch(`/api/staff/${confirmAction.memberId}/access`); fetchStaff(); }
      else if (confirmAction.type === "remove") { await api.delete(`/api/staff/${confirmAction.memberId}`); fetchStaff(); }
      else if (confirmAction.type === "reset") { await api.post(`/api/staff/${confirmAction.memberId}/reset-password`); flash(`Password reset email sent to ${confirmAction.name}.`); }
    } catch { setError("Action failed. Please try again."); }
    finally { setConfirmAction(null); }
  };

  const filtered = staff.filter((s) => {
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || s.role === roleFilter;
    const matchStatus = !statusFilter ||
      (statusFilter === "active" ? s.isActive : !s.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const actionLabels: Record<string, { title: string; msg: string; btn: string }> = {
    access: { title: confirmAction?.isActive ? "Restrict access?" : "Restore access?", msg: `This will ${confirmAction?.isActive ? "prevent" : "restore"} ${confirmAction?.name}'s ability to log in.`, btn: confirmAction?.isActive ? "Restrict" : "Restore" },
    remove: { title: "Remove staff member?", msg: `${confirmAction?.name} will be removed from the organization permanently.`, btn: "Remove" },
    reset: { title: "Reset password?", msg: `A temporary password will be sent to ${confirmAction?.name} by email.`, btn: "Reset password" },
  };

  if (blocked) return null;

  return (
    <div>
      <Topbar title="Staff" slug={params.slug} />
      <div className="p-6">
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search staff..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All roles</option>
              <option value="OWNER">Owner</option>
              <option value="MANAGER">Manager</option>
              <option value="CASHIER">Cashier</option>
              <option value="AUDITOR">Auditor</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{filtered.length} member{filtered.length !== 1 ? "s" : ""}</span>
            {canManage && (
              <Button onClick={() => setShowInviteModal(true)} className="gap-2">
                <UserPlus size={16} /> Invite staff
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Member</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Joined</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Last login</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  {canManage && <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {getInitials(member.name || member.email)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-[#0a0a0a]">{member.name || "Pending"}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Badge variant={roleVariant[member.role]}>{ROLE_LABELS[member.role] || member.role}</Badge></td>
                    <td className="px-5 py-4 hidden md:table-cell text-sm text-gray-500">{formatDate(member.createdAt)}</td>
                    <td className="px-5 py-4 hidden lg:table-cell text-sm text-gray-500">{member.lastLoginAt ? formatDate(member.lastLoginAt) : "Never"}</td>
                    <td className="px-5 py-4"><Badge variant={member.isActive ? "success" : "destructive"}>{member.isActive ? "Active" : "Restricted"}</Badge></td>
                    {canManage && member.role !== "OWNER" && (
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setConfirmAction({ type: "access", memberId: member.id, name: member.name || member.email, isActive: member.isActive })}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#0a0a0a] transition-colors" title={member.isActive ? "Restrict" : "Restore"}>
                            {member.isActive ? <ShieldOff size={15} /> : <Shield size={15} />}
                          </button>
                          <button onClick={() => setConfirmAction({ type: "reset", memberId: member.id, name: member.name || member.email })}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#0a0a0a] transition-colors" title="Reset password">
                            <Key size={15} />
                          </button>
                          <button onClick={() => setConfirmAction({ type: "remove", memberId: member.id, name: member.name || member.email })}
                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-[#DE1010] transition-colors" title="Remove">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                    {canManage && member.role === "OWNER" && <td />}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">No staff members found.</td></tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h3 className="font-bold text-[#0a0a0a] mb-1">Invite a team member</h3>
              <p className="text-gray-500 text-sm mb-5">They will receive an email with a link to join your organization.</p>
              <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
                <div>
                  <Label>Email address</Label>
                  <Input className="mt-1.5" type="email" placeholder="colleague@company.com" {...register("email", { required: true })} />
                </div>
                <div>
                  <Label>Role</Label>
                  <select className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("role", { required: true })}>
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="AUDITOR">Auditor</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send invitation"}</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm action modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-bold text-[#0a0a0a] mb-2">{actionLabels[confirmAction.type]?.title}</h3>
              <p className="text-gray-500 text-sm mb-5">{actionLabels[confirmAction.type]?.msg}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={executeAction} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${confirmAction.type === "remove" ? "bg-[#DE1010] hover:bg-red-700" : "bg-[#0a0a0a] hover:bg-gray-800"}`}>
                  {actionLabels[confirmAction.type]?.btn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}