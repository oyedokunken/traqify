"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Building2, User, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INDUSTRY_OPTIONS, ORG_SIZE_OPTIONS, cn } from "@/lib/utils";
import { useForm } from "react-hook-form";

const TABS = [
  { id: "profile",      label: "Profile",      icon: User,      roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { id: "organization", label: "Organization",  icon: Building2, roles: ["OWNER"] },
  { id: "security",     label: "Security",      icon: Lock,      roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
];

const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function SettingsPage({ params }: { params: { slug: string } }) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const profileForm = useForm({ defaultValues: { name: user?.name || "", email: user?.email || "" } });
  const orgForm = useForm({
    defaultValues: {
      name: user?.organization?.name || "",
      email: (user?.organization as any)?.email || "",
      phone: (user?.organization as any)?.phone || "",
      address: (user?.organization as any)?.address || "",
      industry: (user?.organization as any)?.industry || "",
      size: (user?.organization as any)?.size || "",
    },
  });
  const pwForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const onSaveProfile = async (data: any) => {
    try { await api.patch("/api/auth/me", data); await refreshUser(); flash("Profile updated successfully."); }
    catch (err: any) { setError(err.response?.data?.error || "Failed to update profile."); }
  };

  const onSaveOrg = async (data: any) => {
    try { await api.patch(`/api/organizations/${params.slug}`, data); await refreshUser(); flash("Organization details updated."); }
    catch (err: any) { setError(err.response?.data?.error || "Failed to update organization."); }
  };

  const onChangePassword = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) { setError("Passwords do not match."); return; }
    try { await api.post("/api/auth/change-password", { currentPassword: data.currentPassword, newPassword: data.newPassword }); pwForm.reset(); flash("Password changed successfully."); }
    catch (err: any) { setError(err.response?.data?.error || "Failed to change password."); }
  };

  const role = user?.role || "CASHIER";
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));

  return (
    <div>
      <Topbar title="Settings" slug={params.slug} />
      <div className="p-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === t.id ? "bg-white text-[#0a0a0a] shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Success banner */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile tab */}
          {tab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#0a0a0a] mb-1">Personal information</h3>
              <p className="text-gray-400 text-sm mb-5">Update your name and display preferences.</p>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <div>
                  <Label>Full name</Label>
                  <Input className="mt-1.5" {...profileForm.register("name")} />
                </div>
                <div>
                  <Label>Email address</Label>
                  <Input className="mt-1.5" type="email" {...profileForm.register("email")} disabled />
                  <p className="text-xs text-gray-400 mt-1">Email address cannot be changed.</p>
                </div>
                <Button type="submit" size="sm" className="gap-2 mt-2" disabled={profileForm.formState.isSubmitting}>
                  <Save size={14} />
                  {profileForm.formState.isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Organization tab */}
          {tab === "organization" && role === "OWNER" && (
            <motion.div key="organization" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#0a0a0a] mb-1">Organization details</h3>
              <p className="text-gray-400 text-sm mb-5">Manage your organization information, contact details, and industry.</p>
              <form onSubmit={orgForm.handleSubmit(onSaveOrg)} className="space-y-4">
                <div>
                  <Label>Organization name</Label>
                  <Input className="mt-1.5" {...orgForm.register("name")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business email</Label>
                    <Input className="mt-1.5" type="email" placeholder="info@company.com" {...orgForm.register("email")} />
                  </div>
                  <div>
                    <Label>Business phone</Label>
                    <Input className="mt-1.5" placeholder="+234 800 000 0000" {...orgForm.register("phone")} />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input className="mt-1.5" placeholder="123 Business Road, Lagos" {...orgForm.register("address")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <select className={selectClass} {...orgForm.register("industry")}>
                      <option value="">Select industry...</option>
                      {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Team size</Label>
                    <select className={selectClass} {...orgForm.register("size")}>
                      <option value="">Select size...</option>
                      {ORG_SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <Button type="submit" size="sm" className="gap-2 mt-2" disabled={orgForm.formState.isSubmitting}>
                  <Save size={14} />
                  {orgForm.formState.isSubmitting ? "Saving..." : "Save organization"}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Security tab */}
          {tab === "security" && (
            <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#0a0a0a] mb-1">Change password</h3>
              <p className="text-gray-400 text-sm mb-5">Set a new password for your account. Use at least 8 characters.</p>
              <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-4">
                <div>
                  <Label>Current password</Label>
                  <Input className="mt-1.5" type="password" {...pwForm.register("currentPassword", { required: true })} />
                </div>
                <div>
                  <Label>New password</Label>
                  <Input className="mt-1.5" type="password" {...pwForm.register("newPassword", { required: true, minLength: 8 })} />
                </div>
                <div>
                  <Label>Confirm new password</Label>
                  <Input className="mt-1.5" type="password" {...pwForm.register("confirmPassword", { required: true })} />
                </div>
                <Button type="submit" size="sm" className="gap-2 mt-2" disabled={pwForm.formState.isSubmitting}>
                  <Lock size={14} />
                  {pwForm.formState.isSubmitting ? "Updating..." : "Update password"}
                </Button>
              </form>
            </motion.div>
          )}

        </motion.div>
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}