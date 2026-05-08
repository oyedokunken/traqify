"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/shared/logo";
import { Twitter, Instagram, Linkedin, Github, ArrowRight, Mail } from "lucide-react";
import api from "@/lib/api";

const socials = [
  { icon: Twitter, href: "https://twitter.com/traqify", label: "Twitter" },
  { icon: Instagram, href: "https://instagram.com/traqify", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com/company/traqify", label: "LinkedIn" },
  { icon: Github, href: "https://github.com/oyedokunken/traqify", label: "GitHub" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      await api.post("/api/newsletter/subscribe", { email });
      setStatus("success");
      setMsg("You are subscribed!");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMsg(err.response?.data?.error || "Failed to subscribe. Try again.");
    }
  };

  return (
    <footer className="bg-[#111111] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          <div className="lg:col-span-2">
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
                <button type="submit" disabled={status === "loading"}
                  className="flex-shrink-0 w-9 h-9 bg-[#DE1010] hover:bg-[#c00d0d] rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                  <ArrowRight size={14} />
                </button>
              </div>
              {msg && (
                <p className={`text-xs ${status === "success" ? "text-green-400" : "text-red-400"}`}>{msg}</p>
              )}
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
  );
}
