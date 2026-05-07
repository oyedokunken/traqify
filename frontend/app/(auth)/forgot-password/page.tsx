"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { Logo } from "@/components/shared/logo";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>();

  const onSubmit = async (data: { email: string }) => {
    setError("");
    setSuccess("");
    try {
      await api.post("/api/auth/forgot-password", { email: data.email });
      setEmail(data.email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send reset link.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {!sent ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <Logo href="/" size="md" className="mb-6" />
              <h1 className="text-xl font-bold text-[#0a0a0a] mb-1">Reset your password</h1>
              <p className="text-gray-500 text-sm mb-6">
                Enter your email and we will send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@company.com" className="mt-1.5" {...register("email", { required: true })} />
                </div>
                {error && <p className="text-sm text-[#DE1010]">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center"
            >
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-[#0a0a0a] mb-2">Check your inbox</h2>
              <p className="text-gray-500 text-sm">
                We sent a reset link to <span className="font-medium text-[#0a0a0a]">{email}</span>. It expires in 15 minutes.
              </p>
            </motion.div>
          )}

          <div className="text-center mt-6">
            <Link href="/login" className="text-sm text-gray-500 hover:text-[#0a0a0a] flex items-center justify-center gap-1.5 transition-colors">
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
