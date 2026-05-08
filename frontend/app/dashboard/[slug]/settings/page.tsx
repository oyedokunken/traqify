"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Building2, User, Lock, CheckCircle, XCircle, Camera, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INDUSTRY_OPTIONS, ORG_SIZE_OPTIONS, cn } from "@/lib/utils";
import { useForm } from "react-hook-form";

const TABS = [
  { id: "profile",      label: "Profile",      icon: User,      roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { id: "organization", label: "Organization",  icon: Building2, roles: ["OWNER"] },
  { id: "security",     label: "Security",      icon: Lock,      roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
];

const sel = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ResultModal = { type: "success" | "error"; msg: string } | null;

export default function SettingsPage({ params }: { params: { slug: string } }) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [result, setResult] = useState<ResultModal>(null);
  const [orgData, setOrgData] = useState<any>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const profileForm = useForm({ defaultValues: { name: user?.name || "", email: user?.email || "" } });
  const pwForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();
  const orgForm = useForm({ defaultValues: { phone: "", address: "", website: "", industry: "", size: "", description: "" } });

  // Fetch org details once
  useEffect(() => {
    if (!user?.organizationId) return;
    api.get(`/api/organizations/${params.slug}`).then((r) => {
      const o = r.data;
      setOrgData(o);
      orgForm.reset({ phone: o.phone || "", address: o.address || "", website: o.website || "", industry: o.industry || "", size: o.size || "", description: o.description || "" });
    }).catch(() => {});
  }, [params.slug, user?.organizationId]);

  const flash = (type: "success" | "error", msg: string) => { setResult({ type, msg }); };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData(); fd.append("avatar", file);
      await api.post("/api/auth/upload-avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshUser();
      flash("success", "Profile picture updated.");
    } catch (err: any) { flash("error", err.response?.data?.error || "Upload failed."); }
    finally { setAvatarUploading(false); e.target.value = ""; }
  };

  const onSaveProfile = async (data: any) => {
    try { await api.patch("/api/auth/me", { name: data.name }); await refreshUser(); flash("success", "Profile updated successfully."); }
    catch (err: any) { flash("error", err.response?.data?.error || "Failed to update profile."); }
  };

  const onSaveOrg = async (data: any) => {
    try { await api.patch(`/api/organizations/${params.slug}`, data); await refreshUser(); flash("success", "Organization updated successfully."); }
    catch (err: any) { flash("error", err.response?.data?.error || "Failed to update organization."); }
  };

  const onChangePassword = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) { flash("error", "Passwords do not match."); return; }
    try { await api.post("/api/auth/change-password", { currentPassword: data.currentPassword, newPassword: data.newPassword }); pwForm.reset(); flash("success", "Password changed successfully."); }
    catch (err: any) { flash("error", err.response?.data?.error || "Incorrect current password or server error."); }
  };

  const role = user?.role || "CASHIER";
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));

  return (
    <div>
      <Topbar title="Settings" slug={params.slug} />
      <div className="p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
            {visibleTabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === t.id ? "bg-white text-[#0a0a0a] shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {/* Result modal */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setResult(null)}>
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
                  <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4", result.type === "success" ? "bg-green-100" : "bg-red-100")}>
                    {result.type === "success" ? <CheckCircle size={28} className="text-green-600" /> : <XCircle size={28} className="text-red-500" />}
                  </div>
                  <h3 className="font-bold text-[#0a0a0a] mb-1 text-lg">{result.type === "success" ? "Saved!" : "Error"}</h3>
                  <p className="text-gray-500 text-sm mb-6">{result.msg}</p>
                  <button onClick={() => setResult(null)} className="w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold hover:bg-black/80 transition-colors">OK</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile tab */}
          {tab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#0a0a0a] mb-1">Personal information</h3>
              <p className="text-gray-400 text-sm mb-5">Update your display name and profile picture.</p>
              {/* Avatar upload */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-gray-400">{user?.name?.[0]?.toUpperCase() || "?"}</span>}
                  </div>
                  <label className="absolute bottom-0 right-0 w-6 h-6 bg-[#0a0a0a] rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors">
                    <Camera size={11} className="text-white" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">{user?.name || "Your name"}</p>
                  <p className="text-xs text-gray-400">{avatarUploading ? "Uploading..." : "Click camera icon to change"}</p>
                </div>
              </div>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <div>
                  <Label>Full name</Label>
                  <Input className="mt-1.5" {...profileForm.register("name")} />
                </div>
                <div>
                  <Label>Email address</Label>
                  <div className="relative mt-1.5">
                    <Input type="email" value={user?.email || ""} disabled className="pr-28" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={11} /> Verified
                    </span>
                  </div>
                </div>
                <Button type="submit" size="sm" className="gap-2 mt-2" disabled={profileForm.formState.isSubmitting}>
                  <Save size={14} />{profileForm.formState.isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Organization tab */}
          {tab === "organization" && role === "OWNER" && (
            <motion.div key="organization" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#0a0a0a] mb-1">Organization details</h3>
              <p className="text-gray-400 text-sm mb-5">These details appear on your public store and invoices.</p>
              {/* Immutable fields notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-700">
                Company name and business email were set during registration and cannot be changed.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Company name", value: orgData?.name },
                  { label: "Business email", value: orgData?.email },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                    <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-[#0a0a0a]">{value || <span className="text-gray-300 italic">Not set</span>}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={orgForm.handleSubmit(onSaveOrg)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <Input className="mt-1.5" placeholder="e.g. Technology" {...orgForm.register("industry")} />
                  </div>
                  <div>
                    <Label>Team size</Label>
                    <Input className="mt-1.5" placeholder="e.g. 1-10" {...orgForm.register("size")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Business phone</Label>
                    <Input className="mt-1.5" placeholder="+234 800 000 0000" {...orgForm.register("phone")} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input className="mt-1.5" placeholder="123 Business Road, Lagos" {...orgForm.register("address")} />
                  </div>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input className="mt-1.5" placeholder="https://yoursite.com" {...orgForm.register("website")} />
                </div>
                <div>
                  <Label>Store description</Label>
                  <textarea
                    className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    placeholder="A short description of your store that appears on your public storefront..."
                    maxLength={500}
                    {...orgForm.register("description")}
                  />
                  <p className="text-xs text-gray-400 mt-1">Max 500 characters</p>
                </div>
                <Button type="submit" size="sm" className="gap-2 mt-2" disabled={orgForm.formState.isSubmitting}>
                  <Save size={14} />{orgForm.formState.isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Security tab */}
          {tab === "security" && (
            <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#0a0a0a] mb-1">Change password</h3>
              <p className="text-gray-400 text-sm mb-5">Set a new password for your account. Use at least 8 characters with a mix of letters, numbers and symbols.</p>
              <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-4">
                <div>
                  <Label>Current password</Label>
                  <Input className="mt-1.5" type="password" placeholder="Enter current password" {...pwForm.register("currentPassword", { required: true })} />
                </div>
                <div>
                  <Label>New password</Label>
                  <Input className="mt-1.5" type="password" placeholder="At least 8 characters" {...pwForm.register("newPassword", { required: true, minLength: 8 })} />
                </div>
                <div>
                  <Label>Confirm new password</Label>
                  <Input className="mt-1.5" type="password" placeholder="Repeat new password" {...pwForm.register("confirmPassword", { required: true })} />
                </div>
                <Button type="submit" size="sm" className="gap-2 mt-2" disabled={pwForm.formState.isSubmitting}>
                  <Lock size={14} />{pwForm.formState.isSubmitting ? "Updating..." : "Update password"}
                </Button>
              </form>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}