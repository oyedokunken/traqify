"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsProfileRedirect({ params }: { params: { slug: string } }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/dashboard/${params.slug}/settings`);
  }, [params.slug, router]);
  return null;
}
