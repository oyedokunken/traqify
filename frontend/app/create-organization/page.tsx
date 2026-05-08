"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INDUSTRY_OPTIONS, ORG_SIZE_OPTIONS } from "@/lib/utils";
import { ErrorModal } from "@/components/shared/error-modal";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const schema = z.object({
  name: z.string().min(2, "Organization name is required."),
  email: z.string().email("A valid business email is required."),
  phone: z.string().min(7, "Phone number is required."),
  address: z.string().min(5, "Business address is required."),
  industry: z.string().min(1, "Please select an industry."),
  size: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const selectClass =
  "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.organizationId) {
      router.push(`/dashboard/${user.organization?.slug || ""}/overview`);
    }
  }, [user, router]);

  const [phone, setPhone] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (data.email.toLowerCase() === user?.email?.toLowerCase()) {
      setError(
        "Your business email cannot be the same as your personal account email. Please use a different email address for your organization."
      );
      return;
    }
    try {
      const res = await api.post("/api/organizations", data);
      await refreshUser();
      router.push(`/dashboard/${res.data.slug}/overview`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create organization. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-8 pt-8 pb-2">
              <Logo href="/" size="md" className="mb-6" />
              <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1">Set up your organization</h1>
              <p className="text-gray-500 text-sm mb-6">
                Welcome, <span className="font-medium text-[#0a0a0a]">{user?.name || "there"}</span>. Tell us about your store to get started.
              </p>
            </div>

            <div className="px-8 pb-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label>Organization name</Label>
                  <Input className="mt-1.5" placeholder="Your company or store name" {...register("name")} />
                  {errors.name && <p className="text-xs text-[#DE1010] mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <select className={selectClass} {...register("industry")}>
                      <option value="">Select...</option>
                      {INDUSTRY_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    {errors.industry && <p className="text-xs text-[#DE1010] mt-1">{errors.industry.message}</p>}
                  </div>
                  <div>
                    <Label>Team size</Label>
                    <select className={selectClass} {...register("size")}>
                      <option value="">Select...</option>
                      {ORG_SIZE_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Business email</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    placeholder="info@yourcompany.com"
                    {...register("email")}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Must be different from your personal account email.</p>
                  {errors.email && <p className="text-xs text-[#DE1010] mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label>Business phone</Label>
                  <PhoneInput
                    international
                    defaultCountry="NG"
                    value={phone}
                    onChange={(val) => { setPhone(val || ""); setValue("phone", val || "", { shouldValidate: true }); }}
                    className="mt-1.5 phone-input-wrapper"
                  />
                  {errors.phone && <p className="text-xs text-[#DE1010] mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <Label>Business address</Label>
                  <Input className="mt-1.5" placeholder="123 Business Road, Lagos" {...register("address")} />
                  {errors.address && <p className="text-xs text-[#DE1010] mt-1">{errors.address.message}</p>}
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create organization"}
                  <ArrowRight size={16} />
                </Button>
              </form>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-[#DE1010] font-medium hover:underline">Sign in</a>
          </p>
        </motion.div>
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}