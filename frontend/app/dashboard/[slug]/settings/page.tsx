"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Building2, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INDUSTRY_OPTIONS, ORG_SIZE_OPTIONS } from "@/lib/utils";
import { useForm } from "react-hook-form";

export default function SettingsPage({ params }: { params: { slug: string } }) {
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const profileForm = useForm({
    defaultValues: { name: user?.name || "", email: user?.email || "" },
  });

  const orgForm = useForm({
    defaultValues: {
      name: user?.organization?.name || "",
    },
  });

  const pwForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const onSaveProfile = async (data: any) => {
    try {
      await api.patch("/api/auth/me", data);
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) { setError(err.response?.data?.error || "Failed to update profile."); }
  };

  const onSaveOrg = async (data: any) => {
    try {
      await api.patch(`/api/organizations/${params.slug}`, data);
      setOrgSuccess(true);
      setTimeout(() => setOrgSuccess(false), 3000);
    } catch (err: any) { setError(err.response?.data?.error || "Failed to update organization."); }
  };

  const onChangePassword = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await api.post("/api/auth/change-password", { currentPassword: data.currentPassword, newPassword: data.newPassword });
      pwForm.reset();
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) { setError(err.response?.data?.error || "Failed to change password."); }
  };

  const isOwner = user?.role === "OWNER";

  return (
    <div>
      <Topbar title="Settings" slug={params.slug} />
      <div className="p-6 max-w-2xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={18} className="text-gray-500" />
                <CardTitle className="text-base">Profile</CardTitle>
              </div>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              {profileSuccess && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md mb-4">Profile updated.</p>}
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <div>
                  <Label>Full name</Label>
                  <Input className="mt-1.5" {...profileForm.register("name")} />
                </div>
                <div>
                  <Label>Email address</Label>
                  <Input className="mt-1.5" type="email" {...profileForm.register("email")} disabled />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                </div>
                <Button type="submit" size="sm" className="gap-2" disabled={profileForm.formState.isSubmitting}>
                  <Save size={14} />
                  {profileForm.formState.isSubmitting ? "Saving..." : "Save profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-gray-500" />
                  <CardTitle className="text-base">Organization</CardTitle>
                </div>
                <CardDescription>Manage your organization details</CardDescription>
              </CardHeader>
              <CardContent>
                {orgSuccess && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md mb-4">Organization updated.</p>}
                <form onSubmit={orgForm.handleSubmit(onSaveOrg)} className="space-y-4">
                  <div>
                    <Label>Organization name</Label>
                    <Input className="mt-1.5" {...orgForm.register("name")} />
                  </div>
                  <Button type="submit" size="sm" className="gap-2" disabled={orgForm.formState.isSubmitting}>
                    <Save size={14} />
                    {orgForm.formState.isSubmitting ? "Saving..." : "Save organization"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-gray-500" />
                <CardTitle className="text-base">Password</CardTitle>
              </div>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent>
              {pwSuccess && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md mb-4">Password updated.</p>}
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
                <Button type="submit" size="sm" className="gap-2" disabled={pwForm.formState.isSubmitting}>
                  <Lock size={14} />
                  {pwForm.formState.isSubmitting ? "Updating..." : "Change password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
