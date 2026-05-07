"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/shared/logo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { INDUSTRY_OPTIONS, ORG_SIZE_OPTIONS } from "@/lib/utils";

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Must contain an uppercase letter.")
    .regex(/[a-z]/, "Must contain a lowercase letter.")
    .regex(/[0-9]/, "Must contain a number.")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character."),
});

const step2Schema = z.object({
  orgName: z.string().min(2, "Organization name is required."),
  orgEmail: z.string().email().optional().or(z.literal("")),
  orgPhone: z.string().optional(),
  orgAddress: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const steps = ["Your details", "Your organization", "You're all set"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) });

  const handleStep1 = async (data: Step1Data) => {
    try {
      await api.post("/api/auth/register", data);
      setStep1Data(data);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed.");
    }
  };

  const handleStep2 = async (data: Step2Data) => {
    try {
      router.push(`/verify-email?email=${encodeURIComponent(step1Data!.email)}&orgName=${encodeURIComponent(data.orgName)}&orgEmail=${encodeURIComponent(data.orgEmail || "")}&orgPhone=${encodeURIComponent(data.orgPhone || "")}&orgAddress=${encodeURIComponent(data.orgAddress || "")}&industry=${encodeURIComponent(data.industry || "")}&size=${encodeURIComponent(data.size || "")}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to proceed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-8 pt-8 pb-2">
              <Logo href="/" size="md" className="mb-6" />
              <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1">Create your account</h1>
              <p className="text-gray-500 text-sm">
                {step === 1 && "Start with your personal details"}
                {step === 2 && "Tell us about your organization"}
                {step === 3 && "You're almost there"}
              </p>
            </div>

            <div className="px-8 mb-6">
              <div className="flex items-center gap-1.5 mb-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step > i + 1 ? "bg-green-500" : step === i + 1 ? "bg-[#DE1010]" : "bg-gray-200"}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400">Step {step} of {steps.length}</p>
            </div>

            <div className="px-8 pb-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={form1.handleSubmit(handleStep1)}
                  className="space-y-5"
                >
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" placeholder="Your full name" className="mt-1.5" {...form1.register("name")} />
                    {form1.formState.errors.name && <p className="text-xs text-[#DE1010] mt-1">{form1.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" type="email" placeholder="you@company.com" className="mt-1.5" {...form1.register("email")} />
                    {form1.formState.errors.email && <p className="text-xs text-[#DE1010] mt-1">{form1.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1.5">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" {...form1.register("password")} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {form1.formState.errors.password && <p className="text-xs text-[#DE1010] mt-1">{form1.formState.errors.password.message}</p>}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={form1.formState.isSubmitting}>
                    {form1.formState.isSubmitting ? "Creating account..." : "Continue"}
                    <ArrowRight size={16} />
                  </Button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">or</span></div>
                  </div>

                  <Button type="button" variant="outline" className="w-full gap-3" onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-redirect`; }}>
                    <Image src="/google-logo.png" alt="Google" width={18} height={18} className="w-4.5 h-4.5 object-contain" />
                    Continue with Google
                  </Button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={form2.handleSubmit(handleStep2)}
                  className="space-y-5"
                >
                  <div>
                    <Label htmlFor="orgName">Organization name</Label>
                    <Input id="orgName" placeholder="Your company name" className="mt-1.5" {...form2.register("orgName")} />
                    {form2.formState.errors.orgName && <p className="text-xs text-[#DE1010] mt-1">{form2.formState.errors.orgName.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <select id="industry" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form2.register("industry")}>
                        <option value="">Select...</option>
                        {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="size">Team size</Label>
                      <select id="size" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form2.register("size")}>
                        <option value="">Select...</option>
                        {ORG_SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="orgEmail">Business email (optional)</Label>
                    <Input id="orgEmail" type="email" placeholder="info@company.com" className="mt-1.5" {...form2.register("orgEmail")} />
                  </div>
                  <div>
                    <Label htmlFor="orgAddress">Address (optional)</Label>
                    <Input id="orgAddress" placeholder="123 Business Road, Lagos" className="mt-1.5" {...form2.register("orgAddress")} />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                      <ArrowLeft size={16} />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 gap-2" disabled={form2.formState.isSubmitting}>
                      Continue
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{" "}
              <Link href="/login" className="text-[#DE1010] font-medium hover:underline">Sign in</Link>
            </p>
            </div>
          </div>
        </motion.div>
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
