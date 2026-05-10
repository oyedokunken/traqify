"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { Twitter, Instagram, Linkedin, Github, ArrowRight, Mail, User, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";

const socials = [
  { icon: Twitter, href: "https://twitter.com/traqify", label: "Twitter" },
  { icon: Instagram, href: "https://instagram.com/traqify", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com/company/traqify", label: "LinkedIn" },
  { icon: Github, href: "https://github.com/oyedokunken/traqify", label: "GitHub" },
];

export function Footer() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; type: "success" | "error"; msg: string }>({ open: false, type: "success", msg: "" });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModal({ open: true, type: "error", msg: "Please enter your name." });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setModal({ open: true, type: "error", msg: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/newsletter/subscribe", { email, name: name.trim() });
      setName("");
      setEmail("");
      setModal({ open: true, type: "success", msg: "You are subscribed! Check your inbox for a confirmation." });
    } catch (err: any) {
      setModal({ open: true, type: "error", msg: err.response?.data?.error || "Failed to subscribe. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <footer className="bg-[#111111] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-10 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-4">
              <Logo size="md" className="[&_span:last-child]:text-white" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              A multi-tenant store management platform built for teams that want full control over their retail operations.
            </p>
            <div className="flex items-center gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-[#DE1010] flex items-center justify-center transition-colors">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div>
              <h4 className="text-sm font-semibold mb-5 text-gray-200">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: "Features", href: "/#features" },
                  { label: "About", href: "/#about" },
                  { label: "How it works", href: "/#how-it-works" },
                  { label: "Reviews", href: "/#testimonials" },
                  { label: "FAQ", href: "/#faq" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

          <div>
              <h4 className="text-sm font-semibold mb-5 text-gray-200">Account</h4>
              <ul className="space-y-3">
                {[
                  { label: "Sign up", href: "/register" },
                  { label: "Sign in", href: "/login" },
                  { label: "Dashboard", href: "/login" },
                  { label: "Public store", href: "/store" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

          <div>
            <h4 className="text-sm font-semibold mb-5 text-gray-200">Stay updated</h4>
            <p className="text-gray-400 text-xs mb-4 leading-relaxed">Get product updates and tips delivered to your inbox.</p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Your name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#DE1010] transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#DE1010] transition-colors"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="flex-shrink-0 w-9 h-9 bg-[#DE1010] hover:bg-[#c00d0d] rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="text-gray-600">&copy; {new Date().getFullYear()} Traqify. All rights reserved. Built with{" "}
                <span className="text-white">&#10084;&#65039;</span>{" "}by{" "}
                <a href="https://wa.link/nv875h" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">@oyedokunken</a>
              </span>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-white/20">·</span>
              <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">Terms of Service</Link>
              <span className="text-white/20">·</span>
              <a href="https://github.com/oyedokunken/traqify" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">GitHub</a>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <Image src="/payments.png" alt="Payment methods" width={180} height={28} className="h-7 w-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </footer>

    <AnimatePresence>
      {modal.open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={() => setModal((m) => ({ ...m, open: false }))}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.type === "success" ? "bg-green-100" : "bg-red-50"}`}>
              {modal.type === "success"
                ? <CheckCircle2 size={24} className="text-green-600" />
                : <XCircle size={24} className="text-[#DE1010]" />}
            </div>
            <h3 className="font-bold text-[#0a0a0a] text-center text-base mb-2">
              {modal.type === "success" ? "Subscribed!" : "Subscription failed"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5">{modal.msg}</p>
            <button onClick={() => setModal((m) => ({ ...m, open: false }))}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${modal.type === "success" ? "bg-[#0a0a0a] text-white hover:bg-black/80" : "bg-[#DE1010] text-white hover:bg-red-700"}`}>
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
