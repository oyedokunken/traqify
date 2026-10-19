"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api, { setSession } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      router.push("/login?error=oauth_failed");
      return;
    }

    // Exchange the one-time code for a session. Tokens are never placed in the URL, and the
    // refresh token arrives only as an httpOnly cookie.
    api.get(`/api/auth/oauth-exchange/${code}`)
      .then(({ data }) => {
        if (!data.token || !data.user) throw new Error("Invalid response");
        setSession(data.token, data.user);
        setUser(data.user);
        if (!data.user.organizationId) {
          router.push("/create-organization");
        } else {
          router.push(`/dashboard/${data.user.organization?.slug || ""}/overview`);
        }
      })
      .catch(() => router.push("/login?error=oauth_failed"));
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
