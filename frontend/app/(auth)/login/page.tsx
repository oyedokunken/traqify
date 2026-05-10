"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/shared/logo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorModal } from "@/components/shared/error-modal";
import { useAuth } from "@/lib/auth-context";
import api, { setAuthTokens } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleHint, setIsGoogleHint] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const e = searchParams.get("error");
    const hint = searchParams.get("hint");
    const emailParam = searchParams.get("email");
    if (e === "oauth_failed") setError("Google sign-in failed. Please try again.");
    if (e === "email_account") setError("This email is registered with a password. Please sign in with your email and password instead.");
    if (hint === "exists") setError("You already have an account with this email. Please sign in.");
    if (emailParam) setValue("email", emailParam);
  }, [searchParams, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post("/api/auth/login", data);
      setAuthTokens(res.data.token, res.data.refreshToken, res.data.user);
      setUser(res.data.user);

      if (!res.data.user.organizationId) {
        router.push("/create-organization");
      } else {
        router.push(`/dashboard/${res.data.user.orgSlug || ""}/overview`);
      }
    } catch (err: any) {
      if (err.response?.data?.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }
      if (err.response?.data?.isGoogleAccount) {
        setError("This email uses Google Sign-In. Please click \"Continue with Google\" below.");
        setIsGoogleHint(true);
        return;
      }
      const msg = err.response?.data?.error || "Login failed. Please try again.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="mb-7">
              <Logo href="/" size="md" className="mb-6" />
              <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1">Welcome back</h1>
              <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="mt-1.5"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-[#DE1010] mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-[#DE1010] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-[#DE1010] mt-1">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className={`w-full gap-3 transition-all ${isGoogleHint ? "ring-2 ring-[#DE1010] ring-offset-1" : ""}`}
              disabled={isGoogleLoading}
              onClick={() => {
                setIsGoogleLoading(true);
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-redirect`;
              }}
            >
              <Image src="/google-logo.png" alt="Google" width={18} height={18} className="w-4.5 h-4.5 object-contain" />
              {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-5">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#DE1010] font-medium hover:underline">Create one</Link>
            </p>
          </div>
        </motion.div>
      </div>

      <ErrorModal isOpen={!!error} onClose={() => { setError(""); setIsGoogleHint(false); }} message={error} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
