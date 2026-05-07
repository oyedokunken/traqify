"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/shared/error-modal";
import { Logo } from "@/components/shared/logo";
import api, { setAuthTokens } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  const email = params.get("email") || "";
  const orgName = params.get("orgName") || "";
  const orgEmail = params.get("orgEmail") || "";
  const orgPhone = params.get("orgPhone") || "";
  const orgAddress = params.get("orgAddress") || "";
  const industry = params.get("industry") || "";
  const size = params.get("size") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    text.split("").forEach((char, i) => { next[i] = char; });
    setOtp(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("Please enter the full 6-digit code."); return; }
    setIsVerifying(true);
    try {
      await api.post("/api/auth/verify-email", { email, otp: code });
      setVerified(true);

      const loginRes = await api.post("/api/auth/login", { email, password: "" });

      if (orgName) {
        await api.post("/api/organizations", {
          name: orgName,
          email: orgEmail || undefined,
          phone: orgPhone || undefined,
          address: orgAddress || undefined,
          industry: industry || undefined,
          size: size || undefined,
        });
      }

      await new Promise((r) => setTimeout(r, 1500));
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.error || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setIsResending(true);
    try {
      await api.post("/api/auth/send-otp", { email });
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0a0a0a] mb-2">Email verified</h2>
        <p className="text-gray-500 text-sm">Redirecting you to sign in...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-4">
          <Logo href="/" size="md" className="mb-6" />
          <h1 className="text-xl font-bold text-[#0a0a0a] mb-1">Check your email</h1>
          <p className="text-gray-500 text-sm">
            We sent a 6-digit code to <span className="font-medium text-[#0a0a0a]">{email}</span>
          </p>
        </div>

        <div className="px-8 pb-8">
        <div className="flex justify-center gap-3 mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="w-11 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-[#DE1010] focus:outline-none transition-colors"
            />
          ))}
        </div>

        <Button onClick={handleVerify} className="w-full" disabled={isVerifying || otp.join("").length !== 6}>
          {isVerifying ? "Verifying..." : "Verify email"}
        </Button>

        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={resendCountdown > 0 || isResending}
            className="text-sm text-gray-500 hover:text-[#DE1010] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto transition-colors"
          >
            <RefreshCw size={13} className={isResending ? "animate-spin" : ""} />
            {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
          </button>
        </div>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Wrong email?{" "}
        <Link href="/register" className="text-[#DE1010] font-medium hover:underline">Go back</Link>
      </p>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
      <ErrorModal isOpen={false} onClose={() => {}} message="" />
    </div>
  );
}
