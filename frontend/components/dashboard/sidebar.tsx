"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  BookOpen,
  Warehouse,
  Store,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { motion } from "framer-motion";

const navItems = [
  { href: "overview", label: "Overview", icon: LayoutDashboard, roles: ["OWNER", "MANAGER", "CASHIER", "AUDITOR"] },
  { href: "products", label: "Products", icon: Package, roles: ["OWNER", "MANAGER", "CASHIER", "AUDITOR"] },
  { href: "inventory", label: "Inventory", icon: Warehouse, roles: ["OWNER", "MANAGER", "AUDITOR"] },
  { href: "orders", label: "Orders", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "CASHIER", "AUDITOR"] },
  { href: "customers", label: "Customers", icon: Users, roles: ["OWNER", "MANAGER", "CASHIER"] },
  { href: "staff", label: "Staff", icon: Store, roles: ["OWNER", "MANAGER"] },
  { href: "reports", label: "Reports", icon: BarChart3, roles: ["OWNER", "MANAGER", "AUDITOR"] },
  { href: "audit-logs", label: "Audit Logs", icon: BookOpen, roles: ["OWNER", "MANAGER"] },
];

interface SidebarProps {
  slug: string;
}

export function Sidebar({ slug }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role || "CASHIER";
  const allowed = navItems.filter((item) => item.roles.includes(role));

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
      className="fixed top-0 left-0 h-screen bg-[#0a0a0a] text-white flex flex-col z-30 overflow-hidden"
    >
      <div className={cn("flex items-center h-16 px-4 border-b border-white/10", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link href={`/dashboard/${slug}/overview`} className="text-lg font-bold tracking-tight">
            Traq<span className="text-[#DE1010]">ify</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {allowed.map((item) => {
          const isActive = pathname.includes(`/dashboard/${slug}/${item.href}`);
          return (
            <Link
              key={item.href}
              href={`/dashboard/${slug}/${item.href}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-[#DE1010] text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-white/10">
        <Link
          href={`/dashboard/${slug}/settings`}
          className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all mb-0.5", collapsed && "justify-center px-2")}
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={logout}
          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-[#DE1010] hover:bg-red-500/10 transition-all", collapsed && "justify-center px-2")}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
