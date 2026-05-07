"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ErrorModal } from "@/components/shared/error-modal";
import api, { setAuthTokens } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name is required."),
  password: z.string().min(8, "Password must be at least 8 characters.").regex(/[A-Z]/, "Must have uppercase.").regex(/[0-9]/, "Must have a number."),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

type FormData = z.infer<typeof schema>;

interface InviteDetails {
  email: string;
  role: string;
  organizationName: string;
  organizationLogo: string | null;
}

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api.get(`/api/staff/invite/${params.token}`)
      .then((res) => { setInvite(res.data); setLoading(false); })
      .catch(() => { setInvalid(true); setLoading(false); });
  }, [params.token]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post("/api/auth/accept-invite", {
        token: params.token,
        name: data.name,
        password: data.password,
      });
      setAuthTokens(res.data.token, res.data.refreshToken, res.data.user);
      setUser(res.data.user);
      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/${res.data.user.organization?.slug || ""}/overview`), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept invitation.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500 text-sm">Loading invitation...</div>
    </div>
  );

  if (invalid) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-[#DE1010]" />
        </div>
        <h2 className="text-xl font-bold text-[#0a0a0a] mb-2">Invitation not found</h2>
        <p className="text-gray-500 text-sm">This invitation link is invalid or has already expired.</p>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0a0a0a] mb-2">Welcome to {invite?.organizationName}!</h2>
        <p className="text-gray-500 text-sm">Taking you to your dashboard...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="text-2xl font-bold tracking-tight text-[#0a0a0a] mb-4">
              Traq<span className="text-[#DE1010]">ify</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1">You have been invited</h1>
            <p className="text-gray-500 text-sm">
              Join <span className="font-semibold text-[#0a0a0a]">{invite?.organizationName}</span> on Traqify
            </p>
            {invite?.role && (
              <Badge variant="secondary" className="mt-2">{ROLE_LABELS[invite.role] || invite.role}</Badge>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm text-gray-500 mb-5">
              Setting up account for <span className="font-medium text-[#0a0a0a]">{invite?.email}</span>
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" placeholder="Your full name" className="mt-1.5" {...register("name")} />
                {errors.name && <p className="text-xs text-[#DE1010] mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Create a password</Label>
                <div className="relative mt-1.5">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" {...register("password")} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-[#DE1010] mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" placeholder="Repeat your password" className="mt-1.5" {...register("confirmPassword")} />
                {errors.confirmPassword && <p className="text-xs text-[#DE1010] mt-1">{errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Setting up account..." : "Accept invitation"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
