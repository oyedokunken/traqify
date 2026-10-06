"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, CheckCircle2, AlertTriangle, Key, Globe, Upload, FileText, Eye, Database } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-[#DE1010] pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <nav className="flex items-center justify-center gap-2 text-sm text-white/80 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">Security</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Security Policy</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Learn about our security practices, supported versions, and how to report vulnerabilities.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16">

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#DE1010]" />
            Supported Versions
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Version</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Supported</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">1.23.x</td>
                    <td className="px-4 py-3 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">1.22.x</td>
                    <td className="px-4 py-3 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">1.21.x</td>
                    <td className="px-4 py-3 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600 inline" /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">&lt; 1.21</td>
                    <td className="px-4 py-3 text-sm text-gray-400">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-[#DE1010]" />
            Reporting a Vulnerability
          </h2>
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <p className="text-gray-700 leading-relaxed mb-4">
              Please do not open a public GitHub issue for security vulnerabilities.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Email security reports to: <strong>security@traqify.com</strong> or reach the maintainer via <a href="https://github.com/oyedokunken" target="_blank" rel="noopener noreferrer" className="text-[#DE1010] hover:underline">@oyedokunken</a>.
            </p>
            <p className="text-gray-700 leading-relaxed mb-2 font-medium">Include:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>A clear description of the vulnerability</li>
              <li>Steps to reproduce</li>
              <li>Potential impact assessment</li>
              <li>Any suggested fix (optional)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              You will receive an acknowledgement within 48 hours and a full response within 7 days.
            </p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Key className="w-6 h-6 text-[#DE1010]" />
            Authentication
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Lock, title: "JWT Access Tokens", desc: "7-day default lifetime; signed with JWT_SECRET; carry tokenVersion — incremented on logout and password change to invalidate all outstanding tokens immediately" },
              { icon: Key, title: "Refresh Tokens", desc: "30-day lifetime; signed with JWT_REFRESH_SECRET; validated against tokenVersion on every use" },
              { icon: Globe, title: "Google OAuth 2.0", desc: "Server-side code exchange; tokens stored in OAuthSession (2 min TTL); browser only receives an opaque one-time code — tokens never appear in the URL" },
              { icon: Mail, title: "OTP Email Verification", desc: "SHA-256 hashed before storage; expires after 10 minutes; invalidated after 5 failed attempts" },
              { icon: Shield, title: "Password Hashing", desc: "bcrypt cost factor 12; changePassword requires current password and enforces full complexity rules (uppercase, lowercase, digit, special character)" },
            ].map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 + index * 0.05 }} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-[#DE1010]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#0a0a0a] mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#DE1010]" />
            Authorization (RBAC)
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <p className="text-gray-600 leading-relaxed mb-4">
              Four roles with descending privilege: OWNER &gt; MANAGER &gt; AUDITOR &gt; CASHIER
            </p>
            <ul className="space-y-2">
              {[
                "Route-level enforcement: authenticate middleware, requireOrg middleware, and four RBAC guards (isOwnerOnly, isOwnerOrManager, isAtLeastAuditor, isAtLeastCashier) applied per route",
                "All authenticated routes require a valid JWT; expired tokens and tokens with a stale tokenVersion are rejected with 401",
                "Organization scope enforced on every Prisma query; no query trusts the frontend to scope data",
                "Staff listing (GET /api/staff) requires AUDITOR or above; CASHIER cannot enumerate org members",
                "OWNER protection: the OWNER account cannot be restricted, removed, or have their password reset via staff tools",
                "Invite role cap: OWNER role can never be assigned via invitation",
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#DE1010] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Globe className="w-6 h-6 text-[#DE1010]" />
            Additional Security Measures
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Globe, title: "CORS", desc: "Explicit FRONTEND_URL allowlist; credentials: true for cookie support without wildcard origin" },
              { icon: Upload, title: "File Uploads", desc: "Product images: JPEG/PNG/WebP max 5 MB. Downloadable files: explicit MIME allowlist max 4 MB. Multer memoryStorage — no disk writes" },
              { icon: FileText, title: "Input Validation", desc: "Zod schemas on every request body; all auth routes have full password complexity rules (uppercase, lowercase, digit, special character)" },
              { icon: Eye, title: "Audit Logging", desc: "Every create/update/delete/login/export event logged with actor, entity, IP, user agent, and timestamp; append-only" },
              { icon: Database, title: "Startup Validation", desc: "Server throws before accepting any traffic if JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL, PAYSTACK_SECRET_KEY, or FRONTEND_URL are absent" },
              { icon: Shield, title: "Paystack Verification", desc: "Transaction verified server-side via Paystack API before any order is created; verified amount must match server-calculated total" },
              { icon: Lock, title: "SSRF Protection", desc: "Downloadable product file URLs are validated with URL.hostname.endsWith('.supabase.co') before any server-side fetch" },
              { icon: Key, title: "Cron Job Security", desc: "GET /api/cron/ping requires Authorization: Bearer <CRON_SECRET>; Vercel injects the header automatically; the endpoint is not publicly exploitable" },
            ].map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 + index * 0.05 }} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-[#DE1010]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#0a0a0a] mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
}
