"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthTokens } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const userRaw = params.get("user");

    if (token && refreshToken && userRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(userRaw));
        setAuthTokens(token, refreshToken, user);
        setUser(user);

        if (!user.organizationId) {
          router.push("/create-organization");
        } else {
          router.push(`/dashboard/${user.organization?.slug || ""}/overview`);
        }
      } catch {
        router.push("/login?error=oauth_failed");
      }
    } else {
      router.push("/login?error=oauth_failed");
    }
  }, [params, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
