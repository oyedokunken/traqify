"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getInitials, ROLE_LABELS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  title: string;
  slug: string;
}

export function Topbar({ title, slug }: TopbarProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-[#0a0a0a]">{title}</h1>

      <div className="flex items-center gap-4">
        <button className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Search size={18} />
        </button>

        <button className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>

        <Link
          href={`/dashboard/${slug}/settings/profile`}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name || ""} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#DE1010] text-white text-xs font-bold flex items-center justify-center">
              {getInitials(user?.name || user?.email || "U")}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-[#0a0a0a] leading-none">{user?.name || "User"}</p>
            <Badge variant="secondary" className="mt-0.5 text-xs px-1.5 py-0">
              {ROLE_LABELS[user?.role || ""] || user?.role}
            </Badge>
          </div>
        </Link>
      </div>
    </header>
  );
}
