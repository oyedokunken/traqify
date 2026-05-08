"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  BookOpen, Warehouse, Store, LogOut, ChevronLeft, ChevronRight,
  Settings, Bell,
} from "lucide-react";
import { cn, getInitials, ROLE_LABELS } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "overview",    label: "Overview",    icon: LayoutDashboard, roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { href: "products",    label: "Products",    icon: Package,         roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { href: "inventory",   label: "Inventory",   icon: Warehouse,       roles: ["OWNER","MANAGER","AUDITOR"] },
  { href: "orders",      label: "Orders",      icon: ShoppingCart,    roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { href: "customers",   label: "Customers",   icon: Users,           roles: ["OWNER","MANAGER","CASHIER"] },
  { href: "staff",       label: "Staff",       icon: Store,           roles: ["OWNER","MANAGER"] },
  { href: "reports",     label: "Reports",     icon: BarChart3,       roles: ["OWNER","MANAGER","AUDITOR"] },
  { href: "audit-logs",  label: "Audit Logs",  icon: BookOpen,        roles: ["OWNER","AUDITOR"] },
  { href: "settings",    label: "Settings",    icon: Settings,        roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
];

interface SidebarProps {
  slug: string;
  onCollapse?: (c: boolean) => void;
}

interface TooltipItemProps {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}

function TooltipItem({ label, collapsed, children }: TooltipItemProps) {
  const [show, setShow] = useState(false);
  if (!collapsed) return <>{children}</>;
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/10 text-white text-xs font-medium rounded-md whitespace-nowrap z-50 pointer-events-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ slug, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapse?.(next);
  };

  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { setShowLogoutConfirm(false); logout(); router.push("/login"); };

  const role = user?.role || "CASHIER";
  const allowed = navItems.filter((item) => item.roles.includes(role));
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed top-0 left-0 h-screen bg-[#0a0a0a] text-white flex flex-col z-30 overflow-hidden"
      >
        {/* Header */}
        <div className={cn("flex items-center h-16 px-3 border-b border-white/10", collapsed ? "flex-col justify-center gap-1 pt-3 pb-2 h-auto py-3" : "justify-between")}>
          {collapsed ? (
            <>
              <Link href={`/dashboard/${slug}/overview`} className="w-8 h-8 rounded-lg bg-[#DE1010] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
                  <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                  <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                  <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
                </svg>
              </Link>
              <button onClick={toggle} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors mt-1">
                <ChevronRight size={13} />
              </button>
            </>
          ) : (
            <>
              <Link href={`/dashboard/${slug}/overview`} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#DE1010] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
                    <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                    <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
                  </svg>
                </div>
                <span className="text-base font-bold tracking-tight">Traq<span className="text-[#DE1010]">ify</span></span>
              </Link>
              <button onClick={toggle} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <ChevronLeft size={14} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {allowed.map((item) => {
            const isActive = pathname.includes(`/dashboard/${slug}/${item.href}`);
            return (
              <TooltipItem key={item.href} label={item.label} collapsed={collapsed}>
                <Link
                  href={`/dashboard/${slug}/${item.href}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive ? "bg-[#DE1010] text-white" : "text-gray-400 hover:text-white hover:bg-white/10",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </TooltipItem>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className={cn("p-2 border-t border-white/10 space-y-1", collapsed && "flex flex-col items-center")}>
          <TooltipItem label={`${firstName} (${ROLE_LABELS[role] || role})`} collapsed={collapsed}>
            <Link href={`/dashboard/${slug}/settings`} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all", collapsed && "justify-center px-2")}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={firstName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#DE1010] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {getInitials(user?.name || user?.email || "U")}
                </div>
              )}
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white leading-none truncate">{firstName}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{ROLE_LABELS[role] || role}</p>
                </div>
              )}
            </Link>
          </TooltipItem>

          <TooltipItem label="Sign out" collapsed={collapsed}>
            <button
              onClick={handleLogout}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-[#DE1010] hover:bg-red-500/10 transition-all", collapsed && "justify-center px-2")}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </TooltipItem>
        </div>
      </motion.aside>

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-bold text-[#0a0a0a] mb-2">Sign out?</h3>
              <p className="text-gray-500 text-sm mb-5">You will be redirected to the login page.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={confirmLogout} className="flex-1 px-4 py-2 bg-[#DE1010] text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Sign out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}