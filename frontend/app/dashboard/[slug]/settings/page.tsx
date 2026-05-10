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
  const profileForm = useForm({ defaultValues: { name: user?.name || "", phone: user?.phone || "" } });
  const pwForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();
  const orgForm = useForm({ defaultValues: { phone: "", address: "", website: "", industry: "", size: "", description: "" } });

  // Sync profile form when user data loads
  useEffect(() => {
    if (user) profileForm.reset({ name: user.name || "", phone: user.phone || "" });
  }, [user?.id]);

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
    try { await api.patch("/api/auth/me", { name: data.name, phone: data.phone || undefined }); await refreshUser(); flash("success", "Profile updated successfully."); }
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Full name</Label>
                    <Input className="mt-1.5" {...profileForm.register("name")} />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <div className="mt-1.5 flex h-10 w-full items-center rounded-md border border-input bg-gray-50 px-3 text-sm text-gray-500 cursor-not-allowed select-none">
                      {user?.role || "CASHIER"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email address</Label>
                    <div className="relative mt-1.5">
                      <Input type="email" value={user?.email || ""} disabled className="pr-28" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={11} /> Verified
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Phone number</Label>
                    <Input className="mt-1.5" type="tel" placeholder="+234 800 000 0000" {...profileForm.register("phone")} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Website</Label>
                    <Input className="mt-1.5" placeholder="https://yoursite.com" {...orgForm.register("website")} />
                  </div>
                  <div>
                    <Label>Store description</Label>
                    <textarea
                      className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      placeholder="A short description of your store..."
                      maxLength={500}
                      {...orgForm.register("description")}
                    />
                    <p className="text-xs text-gray-400 mt-1">Max 500 characters</p>
                  </div>
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
              <h3 className="font-semibold text-[#0a0a0a] mb-1">Security settings</h3>
              <p className="text-gray-400 text-sm mb-5">Manage your account authentication method.</p>

              {/* Auth method indicator */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user?.signInMethod === "GOOGLE" ? (
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#DE1010] flex items-center justify-center">
                        <Lock size={12} className="text-white" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#0a0a0a]">
                        {user?.signInMethod === "GOOGLE" ? "Signed in with Google" : "Signed in with email & password"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user?.signInMethod === "GOOGLE" ? "Your account is linked to your Google account" : "Your account uses email and password authentication"}
                      </p>
                    </div>
                  </div>
                  {user?.signInMethod === "GOOGLE" && (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                      Connected
                    </span>
                  )}
                </div>
              </div>

              {/* Password change - only for email auth */}
              {user?.signInMethod !== "GOOGLE" && (
                <>
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
                </>
              )}

              {user?.signInMethod === "GOOGLE" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-blue-700">
                    Password management is handled by your Google account. To change your password, visit your Google Account settings.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}