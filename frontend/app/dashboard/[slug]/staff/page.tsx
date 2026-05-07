"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Shield, ShieldOff, Trash2, Key, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { formatDate, getInitials, ROLE_LABELS } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";

interface StaffMember {
  id: string;
  name?: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  invitedBy?: { name: string };
}

const roleVariant: Record<string, any> = {
  OWNER: "default",
  MANAGER: "info",
  CASHIER: "secondary",
  AUDITOR: "outline",
};

export default function StaffPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ email: string; role: string }>();

  const isOwner = user?.role === "OWNER";
  const canManage = ["OWNER", "MANAGER"].includes(user?.role || "");

  const fetchStaff = () => {
    api.get("/api/staff")
      .then((r) => setStaff(r.data))
      .catch(() => setError("Failed to load staff."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const onInvite = async (data: { email: string; role: string }) => {
    try {
      await api.post("/api/staff/invite", data);
      reset();
      setShowInvite(false);
      setSuccessMsg(`Invitation sent to ${data.email}.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) { setError(err.response?.data?.error || "Failed to send invitation."); }
  };

  const toggleAccess = async (memberId: string, name: string, isActive: boolean) => {
    if (!confirm(`${isActive ? "Restrict" : "Restore"} access for ${name}?`)) return;
    try {
      await api.patch(`/api/staff/${memberId}/access`);
      fetchStaff();
    } catch { setError("Failed to update access."); }
  };

  const removeMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from the organization?`)) return;
    try {
      await api.delete(`/api/staff/${memberId}`);
      fetchStaff();
    } catch { setError("Failed to remove staff member."); }
  };

  const resetPassword = async (memberId: string, name: string) => {
    if (!confirm(`Reset password for ${name}? They will receive a temporary password by email.`)) return;
    try {
      await api.post(`/api/staff/${memberId}/reset-password`);
      setSuccessMsg(`Password reset email sent to ${name}.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch { setError("Failed to reset password."); }
  };

  return (
    <div>
      <Topbar title="Staff" slug={params.slug} />
      <div className="p-6">
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            {successMsg}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{staff.length} team member{staff.length !== 1 ? "s" : ""}</p>
          {canManage && (
            <Button onClick={() => setShowInvite(!showInvite)} className="gap-2">
              <UserPlus size={16} />
              Invite staff
            </Button>
          )}
        </div>

        {showInvite && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
          >
            <h3 className="font-semibold text-[#0a0a0a] mb-4">Send invitation</h3>
            <form onSubmit={handleSubmit(onInvite)} className="flex gap-4">
              <div className="flex-1">
                <Label>Email address</Label>
                <Input className="mt-1.5" type="email" placeholder="colleague@company.com" {...register("email", { required: true })} />
              </div>
              <div className="w-40">
                <Label>Role</Label>
                <select className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("role", { required: true })}>
                  <option value="MANAGER">Manager</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="AUDITOR">Auditor</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send invite"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              </div>
            </form>
          </motion.div>
        )}

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
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Joined</th>
                  {canManage && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#DE1010] flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(member.name || member.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0a0a0a]">{member.name || "—"}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={roleVariant[member.role]} className="text-xs">
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Badge variant={member.isActive ? "success" : "destructive"} className="text-xs">
                        {member.isActive ? "Active" : "Restricted"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">{formatDate(member.createdAt)}</td>
                    {canManage && member.id !== user?.id && member.role !== "OWNER" && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => toggleAccess(member.id, member.name || member.email, member.isActive)}
                            title={member.isActive ? "Restrict access" : "Restore access"}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            {member.isActive ? <ShieldOff size={14} /> : <Shield size={14} />}
                          </button>
                          <button
                            onClick={() => resetPassword(member.id, member.name || member.email)}
                            title="Reset password"
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Key size={14} />
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => removeMember(member.id, member.name || member.email)}
                              title="Remove from organization"
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[#DE1010] hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    {canManage && (member.id === user?.id || member.role === "OWNER") && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
