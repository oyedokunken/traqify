"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

const step2Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Must contain an uppercase letter.")
    .regex(/[a-z]/, "Must contain a lowercase letter.")
    .regex(/[0-9]/, "Must contain a number.")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character."),
});

const step3Schema = z.object({
  orgName: z.string().min(2, "Organization name is required."),
  orgEmail: z.string().email().optional().or(z.literal("")),
  orgAddress: z.string().min(3, "Business address is required."),
  industry: z.string().optional(),
  size: z.string().optional(),
});

type EmailData = z.infer<typeof emailSchema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const steps = ["Email", "Your details", "Your organization", "You're all set"];

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const verifiedEmail = params.get("verifiedEmail");
  
  const [step, setStep] = useState(verifiedEmail ? 2 : 1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const emailForm = useForm<EmailData>({ resolver: zodResolver(emailSchema) });
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema), defaultValues: {} });
  const form3 = useForm<Step3Data>({ resolver: zodResolver(step3Schema) });
  const watchedPassword = form2.watch("password", "");

  useEffect(() => {
    if (verifiedEmail) {
      setEmailData({ email: verifiedEmail });
      form2.reset();
    }
  }, [verifiedEmail, form2]);

  function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    const checks = [
      pw.length >= 8,
      /[A-Z]/.test(pw),
      /[a-z]/.test(pw),
      /[0-9]/.test(pw),
      /[^A-Za-z0-9]/.test(pw),
    ];
    const score = checks.filter(Boolean).length;
    if (score <= 2) return { score, label: "Weak", color: "bg-[#DE1010]" };
    if (score <= 4) return { score, label: "Medium", color: "bg-yellow-400" };
    return { score, label: "Strong", color: "bg-green-500" };
  }

  const handleEmailStep = async (data: EmailData) => {
    try {
      const checkRes = await api.post("/api/auth/check-email", { email: data.email });
      if (checkRes.data.exists) {
        if (checkRes.data.signInMethod === "GOOGLE") {
          setError("This email is already registered with Google. Please use 'Continue with Google' to sign in.");
          return;
        }
        router.push(`/login?email=${encodeURIComponent(data.email)}&hint=exists`);
        return;
      }
      await api.post("/api/auth/send-otp", { email: data.email });
      setEmailData(data);
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}&returnTo=register`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send verification code.");
    }
  };

  const handleStep2 = async (data: Step2Data) => {
    if (!emailData) return;
    const nameParts = data.name.toLowerCase().split(" ").filter(Boolean);
    const emailLocal = emailData.email.split("@")[0].toLowerCase();
    const pw = data.password.toLowerCase();
    const containsName = nameParts.some((part) => part.length > 2 && pw.includes(part));
    const containsEmail = emailLocal.length > 2 && pw.includes(emailLocal);
    if (containsName || containsEmail) {
      setError("Your password cannot contain your name or email address. Please choose a stronger password.");
      return;
    }
    try {
      const res = await api.post("/api/auth/register", { ...data, email: emailData.email });
      setStep2Data(data);
      if (res.data.token) {
        // Save token temporarily — we need it to call /api/organizations
        setPendingToken(res.data.token);
        api.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      }
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed.");
    }
  };

  const [orgPhone, setOrgPhone] = useState("");

  const handleStep3 = async (data: Step3Data) => {
    if (!orgPhone) { setError("Business phone number is required."); return; }
    try {
      const orgRes = await api.post("/api/organizations", {
        name: data.orgName,
        email: data.orgEmail || undefined,
        phone: orgPhone || undefined,
        address: data.orgAddress || undefined,
        industry: data.industry || undefined,
        size: data.size || undefined,
      });
      // Re-login to get a fresh JWT that includes the new organizationId
      if (emailData && step2Data) {
        const loginRes = await api.post("/api/auth/login", {
          email: emailData.email,
          password: step2Data.password,
        });
        api.defaults.headers.common["Authorization"] = `Bearer ${loginRes.data.token}`;
        localStorage.setItem("traqify_token", loginRes.data.token);
        localStorage.setItem("traqify_refresh_token", loginRes.data.refreshToken);
        localStorage.setItem("traqify_user", JSON.stringify(loginRes.data.user));
        router.push(`/dashboard/${orgRes.data.slug}/overview`);
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create organization.");
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
                {step === 1 && "Let's start with your email"}
                {step === 2 && "Now set up your account"}
                {step === 3 && "Tell us about your organization"}
                {step === 4 && "You're all set"}
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
                  onSubmit={emailForm.handleSubmit(handleEmailStep)}
                  className="space-y-5"
                >
                  <div>
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" type="email" placeholder="you@company.com" className="mt-1.5" {...emailForm.register("email")} />
                    {emailForm.formState.errors.email && <p className="text-xs text-[#DE1010] mt-1">{emailForm.formState.errors.email.message}</p>}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={emailForm.formState.isSubmitting}>
                    {emailForm.formState.isSubmitting ? "Sending code..." : "Send verification code"}
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
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-green-700">
                      <strong>Email verified:</strong> {emailData?.email}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" placeholder="Your full name" className="mt-1.5" {...form2.register("name")} />
                    {form2.formState.errors.name && <p className="text-xs text-[#DE1010] mt-1">{form2.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1.5">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" {...form2.register("password")} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {watchedPassword.length > 0 && (() => {
                      const { score, label, color } = getPasswordStrength(watchedPassword);
                      return (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[1,2,3,4,5].map((i) => (
                              <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                                i <= score ? color : "bg-gray-200"
                              }`} />
                            ))}
                          </div>
                          <p className={`text-[10px] font-medium ${
                            score <= 2 ? "text-[#DE1010]" : score <= 4 ? "text-yellow-500" : "text-green-600"
                          }`}>{label} password</p>
                        </div>
                      );
                    })()}
                    {form2.formState.errors.password && <p className="text-xs text-[#DE1010] mt-1">{form2.formState.errors.password.message}</p>}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={form2.formState.isSubmitting}>
                    {form2.formState.isSubmitting ? "Creating account..." : "Continue"}
                    <ArrowRight size={16} />
                  </Button>
                </motion.form>
              )}

              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={form3.handleSubmit(handleStep3)}
                  className="space-y-5"
                >
                  <div>
                    <Label htmlFor="orgName">Organization name</Label>
                    <Input id="orgName" placeholder="Your company name" className="mt-1.5" {...form3.register("orgName")} />
                    {form3.formState.errors.orgName && <p className="text-xs text-[#DE1010] mt-1">{form3.formState.errors.orgName.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <select id="industry" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form3.register("industry")}>
                        <option value="">Select...</option>
                        {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="size">Team size</Label>
                      <select id="size" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form3.register("size")}>
                        <option value="">Select...</option>
                        {ORG_SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="orgEmail">Business email (optional)</Label>
                    <Input id="orgEmail" type="email" placeholder="info@company.com" className="mt-1.5" {...form3.register("orgEmail")} />
                  </div>
                  <div>
                    <Label>Business phone <span className="text-[#DE1010]">*</span></Label>
                    <PhoneInput
                      international defaultCountry="NG" value={orgPhone} onChange={(v) => setOrgPhone(v || "")}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring"
                    />
                  </div>
                  <div>
                    <Label htmlFor="orgAddress">Business address <span className="text-[#DE1010]">*</span></Label>
                    <Input id="orgAddress" placeholder="123 Business Road, Lagos" className="mt-1.5" {...form3.register("orgAddress")} />
                    {form3.formState.errors.orgAddress && <p className="text-xs text-[#DE1010] mt-1">{form3.formState.errors.orgAddress.message}</p>}
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}>
                      <ArrowLeft size={16} />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 gap-2" disabled={form3.formState.isSubmitting}>
                      {form3.formState.isSubmitting ? "Creating..." : "Complete setup"}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400 text-sm">Loading...</div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
