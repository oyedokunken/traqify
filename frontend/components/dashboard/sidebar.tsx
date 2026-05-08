"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  BookOpen, Warehouse, UserCog, LogOut, ChevronLeft, ChevronRight,
  Settings, Tag, Globe, Truck, Mail, X, Star,
} from "lucide-react";
import { cn, getInitials, ROLE_LABELS } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "react-tooltip";
import { useSidebar } from "@/lib/sidebar-context";

const navItems = [
  { href: "overview",    label: "Overview",    icon: LayoutDashboard, roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { href: "products",    label: "Products",    icon: Package,         roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { href: "categories",  label: "Categories",  icon: Tag,             roles: ["OWNER","MANAGER"] },
  { href: "inventory",   label: "Inventory",   icon: Warehouse,       roles: ["OWNER","MANAGER","AUDITOR"] },
  { href: "orders",      label: "Orders",      icon: ShoppingCart,    roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { href: "customers",   label: "Customers",   icon: Users,           roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
  { href: "staff",       label: "Staff",       icon: UserCog,         roles: ["OWNER","MANAGER"] },
  { href: "store",       label: "Storefront",  icon: Globe,           roles: ["OWNER","MANAGER"] },
  { href: "logistics",   label: "Logistics",   icon: Truck,           roles: ["OWNER","MANAGER"] },
  { href: "reports",     label: "Reports",     icon: BarChart3,       roles: ["OWNER","MANAGER","AUDITOR"] },
  { href: "newsletter",  label: "Newsletter",  icon: Mail,            roles: ["OWNER","MANAGER"] },
  { href: "reviews",     label: "Reviews",     icon: Star,            roles: ["OWNER","MANAGER"] },
  { href: "audit-logs",  label: "Audit Logs",  icon: BookOpen,        roles: ["OWNER","AUDITOR"] },
  { href: "settings",    label: "Settings",    icon: Settings,        roles: ["OWNER","MANAGER","CASHIER","AUDITOR"] },
];

interface SidebarProps {
  slug: string;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export function Sidebar({ slug, collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { mobileOpen, closeMobile } = useSidebar();

  const toggle = () => onCollapse(!collapsed);
  const confirmLogout = () => { setShowLogoutConfirm(false); logout(); router.push("/login"); };

  const role = user?.role || "CASHIER";
  const allowed = navItems.filter((item) => item.roles.includes(role));
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  const logoMark = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
    </svg>
  );

  return (
    <>
      {/* react-tooltip portal */}
      <Tooltip id="sidebar-tip" place="right" className="!text-xs !py-1.5 !px-2.5 !rounded-lg !bg-[#1a1a1a] !border !border-white/10 z-[100]" />

      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className={cn(
          "hidden md:flex h-screen bg-[#0a0a0a] text-white flex-col flex-shrink-0 overflow-hidden transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center border-b border-white/10 flex-shrink-0",
          collapsed ? "flex-col justify-center gap-1 px-2 py-3" : "h-16 px-3 justify-between"
        )}>
          {collapsed ? (
            <>
              <Link href={`/dashboard/${slug}/overview`} className="w-8 h-8 rounded-lg bg-[#DE1010] flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
                  <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                  <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
                  <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
                </svg>
              </Link>
              <button onClick={toggle} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                <ChevronRight size={13} />
              </button>
            </>
          ) : (
            <>
              <Link href={`/dashboard/${slug}/overview`} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#DE1010] flex items-center justify-center flex-shrink-0">
                  {logoMark}
                </div>
                <span className="text-base font-bold tracking-tight whitespace-nowrap">Traq<span className="text-[#DE1010]">ify</span></span>
              </Link>
              <button onClick={toggle} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
                <ChevronLeft size={14} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden no-scrollbar">
          {allowed.map((item) => {
            const isActive = pathname.includes(`/dashboard/${slug}/${item.href}`);
            return (
              <Link
                key={item.href}
                href={`/dashboard/${slug}/${item.href}`}
                data-tooltip-id={collapsed ? "sidebar-tip" : undefined}
                data-tooltip-content={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ? "bg-[#DE1010] text-white" : "text-gray-400 hover:text-white hover:bg-white/10",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className={cn("flex-shrink-0 p-2 border-t border-white/10 space-y-1", collapsed && "flex flex-col items-center")}>
          <Link
            href={`/dashboard/${slug}/settings`}
            data-tooltip-id={collapsed ? "sidebar-tip" : undefined}
            data-tooltip-content={collapsed ? `${firstName} (${ROLE_LABELS[role] || role})` : undefined}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all", collapsed && "justify-center px-2")}
          >
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
          <button
            onClick={() => setShowLogoutConfirm(true)}
            data-tooltip-id={collapsed ? "sidebar-tip" : undefined}
            data-tooltip-content={collapsed ? "Sign out" : undefined}
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-[#DE1010] hover:bg-red-500/10 transition-all", collapsed && "justify-center px-2")}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={closeMobile}
            />
            <motion.div
              initial={{ x: -264 }} animate={{ x: 0 }} exit={{ x: -264 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] text-white flex flex-col overflow-hidden md:hidden"
            >
              {/* Header */}
              <div className="h-16 px-3 flex items-center justify-between border-b border-white/10 flex-shrink-0">
                <Link href={`/dashboard/${slug}/overview`} onClick={closeMobile} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#DE1010] flex items-center justify-center flex-shrink-0">
                    {logoMark}
                  </div>
                  <span className="text-base font-bold tracking-tight whitespace-nowrap">Traq<span className="text-[#DE1010]">ify</span></span>
                </Link>
                <button onClick={closeMobile} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
                {allowed.map((item) => {
                  const isActive = pathname.includes(`/dashboard/${slug}/${item.href}`);
                  return (
                    <Link
                      key={item.href}
                      href={`/dashboard/${slug}/${item.href}`}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        isActive ? "bg-[#DE1010] text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User + Logout */}
              <div className="flex-shrink-0 p-2 border-t border-white/10 space-y-1">
                <Link
                  href={`/dashboard/${slug}/settings`}
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={firstName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#DE1010] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {getInitials(user?.name || user?.email || "U")}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white leading-none truncate">{firstName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{ROLE_LABELS[role] || role}</p>
                  </div>
                </Link>
                <button
                  onClick={() => { closeMobile(); setShowLogoutConfirm(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-[#DE1010] hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={18} className="flex-shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-bold text-[#0a0a0a] mb-2">Sign out?</h3>
              <p className="text-gray-500 text-sm mb-5">You will be redirected to the login page.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={confirmLogout} className="flex-1 px-4 py-2 bg-[#DE1010] text-white rounded-lg text-sm font-medium hover:bg-red-700">Sign out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}