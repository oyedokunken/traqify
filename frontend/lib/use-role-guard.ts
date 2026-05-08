"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function useRoleGuard(allowedRoles: string[], redirectTo: string) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, allowedRoles, redirectTo, router]);

  const blocked = !isLoading && !!user && !allowedRoles.includes(user.role);
  return { blocked };
}
