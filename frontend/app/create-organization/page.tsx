"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INDUSTRY_OPTIONS, ORG_SIZE_OPTIONS } from "@/lib/utils";
import { useState } from "react";
import { ErrorModal } from "@/components/shared/error-modal";

const schema = z.object({
  name: z.string().min(2, "Organization name is required."),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.organizationId) {
      router.push(`/dashboard/${user.organization?.slug || ""}/overview`);
    }
  }, [user, router]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post("/api/organizations", data);
      await refreshUser();
      router.push(`/dashboard/${res.data.slug}/overview`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create organization.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="text-2xl font-bold tracking-tight text-[#0a0a0a] mb-4">
              Traq<span className="text-[#DE1010]">ify</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1">Set up your organization</h1>
            <p className="text-gray-500 text-sm">
              Welcome, <span className="font-medium">{user?.name || "there"}</span>. Tell us about your store to get started.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label>Organization name</Label>
                <Input className="mt-1.5" placeholder="Your company name" {...register("name")} />
                {errors.name && <p className="text-xs text-[#DE1010] mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <select
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register("industry")}
                  >
                    <option value="">Select...</option>
                    {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Team size</Label>
                  <select
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register("size")}
                  >
                    <option value="">Select...</option>
                    {ORG_SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label>Business email (optional)</Label>
                <Input className="mt-1.5" type="email" placeholder="info@company.com" {...register("email")} />
              </div>

              <div>
                <Label>Phone (optional)</Label>
                <Input className="mt-1.5" placeholder="+234..." {...register("phone")} />
              </div>

              <div>
                <Label>Address (optional)</Label>
                <Input className="mt-1.5" placeholder="123 Business Road, Lagos" {...register("address")} />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create organization"}
                <ArrowRight size={16} />
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
      <ErrorModal isOpen={!!error} onClose={() => setError("")} message={error} />
    </div>
  );
}
