"use client";

import { Bell, Search, Settings, LogOut, X, Menu, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useSidebar } from "@/lib/sidebar-context";

interface TopbarProps {
  title: string;
  slug: string;
}

interface SearchResult {
  type: string;
  label: string;
  sub: string;
  href: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  isRead: boolean;
  createdAt: string;
  user?: { name: string | null; email: string };
}

export function Topbar({ title, slug }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { openMobile } = useSidebar();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBell, setShowBell] = useState(false);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // "/" keybinding to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setSearchOpen(false); setQuery(""); setResults([]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close user menu and bell on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canSeeNotifications = ["OWNER","MANAGER","AUDITOR"].includes(user?.role || "");

  const fetchUnread = useCallback(() => {
    if (!canSeeNotifications || !user?.organizationId) return;
    api.get("/api/audit-logs/unread-count").then((r) => setUnreadCount(r.data.count ?? 0)).catch(() => {});
  }, [canSeeNotifications, user?.organizationId]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  const openBell = () => {
    if (!canSeeNotifications) return;
    setShowBell((v) => !v);
    if (!showBell) {
      api.get("/api/audit-logs?page=1&limit=3").then((r) => setRecentLogs(r.data.logs || [])).catch(() => {});
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/api/audit-logs/mark-read", { all: true, isRead: true });
      setUnreadCount(0);
      setRecentLogs((prev) => prev.map((l) => ({ ...l, isRead: true })));
    } catch {}
  };

  const markRead = () => {
    api.patch("/api/audit-logs/mark-read", { all: true, isRead: true }).catch(() => {});
    setUnreadCount(0);
  };

  // Real-time search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const base = `/dashboard/${slug}`;
      const [products, orders, customers] = await Promise.allSettled([
        api.get(`/api/products?search=${encodeURIComponent(q)}&limit=3`),
        api.get(`/api/orders?search=${encodeURIComponent(q)}&limit=3`),
        api.get(`/api/customers?search=${encodeURIComponent(q)}&limit=3`),
      ]);
      const out: SearchResult[] = [];
      if (products.status === "fulfilled") {
        (products.value.data.products || products.value.data || []).slice(0,3).forEach((p: any) =>
          out.push({ type: "Product", label: p.name, sub: p.sku || "", href: `${base}/products` })
        );
      }
      if (orders.status === "fulfilled") {
        (orders.value.data.orders || orders.value.data || []).slice(0,3).forEach((o: any) =>
          out.push({ type: "Order", label: `#${o.id.slice(-6).toUpperCase()}`, sub: o.customer?.name || "", href: `${base}/orders` })
        );
      }
      if (customers.status === "fulfilled") {
        (customers.value.data.customers || customers.value.data || []).slice(0,3).forEach((c: any) =>
          out.push({ type: "Customer", label: c.name, sub: c.email || "", href: `${base}/customers` })
        );
      }
      setResults(out);
    } catch {}
  }, [slug]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const handleLogout = () => { setShowUserMenu(false); setShowLogoutConfirm(true); };
  const confirmLogout = () => { setShowLogoutConfirm(false); logout(); router.push("/login"); };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="md:hidden p-2 -ml-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={openMobile}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-[#0a0a0a]">{title}</h1>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search everything..."
              className="w-full h-9 pl-9 pr-10 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DE1010]/20 focus:border-[#DE1010]/30 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded font-mono">/</kbd>
            <AnimatePresence>
              {searchOpen && (query || results.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                >
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">{query ? "No results found." : "Start typing to search..."}</p>
                  ) : (
                    results.map((r, i) => (
                      <button key={i} onClick={() => { router.push(r.href); setSearchOpen(false); setQuery(""); setResults([]); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-16 flex-shrink-0">{r.type}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0a0a0a] truncate">{r.label}</p>
                          {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bell */}
          {canSeeNotifications && (
            <div className="relative flex-shrink-0" ref={bellRef}>
              <button onClick={openBell}
                className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#DE1010] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showBell && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-[#0a0a0a]">Notifications</p>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                            <CheckCheck size={12} /> Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    {recentLogs.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {recentLogs.map((log) => (
                          <Link key={log.id} href={`/dashboard/${slug}/audit-logs/${log.id}`}
                            onClick={() => { setShowBell(false); fetchUnread(); }}
                            className={`flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors ${!log.isRead ? "bg-red-50/40" : ""}`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!log.isRead ? "bg-[#DE1010]" : "bg-gray-200"}`} />
                            <p className="text-[11px] text-[#0a0a0a] truncate flex-1">
                              <span className="font-semibold">{log.action}</span>
                              <span className="text-gray-400"> · </span>
                              <span className="text-gray-600">{log.user?.name?.split(" ")[0] || log.user?.email?.split("@")[0] || "System"}</span>
                              <span className="text-gray-400"> · </span>
                              <span className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-gray-100 px-4 py-2.5">
                      <Link href={`/dashboard/${slug}/audit-logs`} onClick={() => { setShowBell(false); markRead(); }}
                        className="text-xs text-[#DE1010] font-medium hover:underline">View all notifications</Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Avatar */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={() => setShowUserMenu((v) => !v)} className="w-9 h-9 rounded-full hover:ring-2 hover:ring-[#DE1010]/30 transition-all overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#DE1010] text-white text-xs font-bold flex items-center justify-center">
                  {getInitials(user?.name || user?.email || "U")}
                </div>
              )}
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-[#0a0a0a] truncate">{user?.name || user?.email}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link href={`/dashboard/${slug}/settings`} onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <Settings size={15} /> Settings
                  </Link>
                  <Link href={`/dashboard/${slug}/audit-logs`} onClick={() => { setShowUserMenu(false); markRead(); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <Bell size={15} /> Notifications {unreadCount > 0 && <span className="ml-auto text-[10px] bg-[#DE1010] text-white px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#DE1010] hover:bg-red-50 transition-colors">
                    <LogOut size={15} /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Logout confirm */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
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