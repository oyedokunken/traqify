"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { motion } from "framer-motion";
import { Calendar, PlusCircle, Wrench, Bug, GitCommit, Shield } from "lucide-react";

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-[#DE1010] pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <nav className="flex items-center justify-center gap-2 text-sm text-white/80 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">Changelog</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Changelog</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              All notable changes to Traqify are documented in this file. Format follows Keep a Changelog.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16">

        {/* v1.23.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.23.0 - 2026-05-20</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-[#0a0a0a]">Documentation</h3>
              </div>
              <ul className="space-y-1 columns-1 md:columns-2">
                <li className="text-sm text-gray-600">backend/README.md full rewrite with Mermaid diagrams, middleware pipeline, full API reference, and ER diagram</li>
                <li className="text-sm text-gray-600">frontend/README.md full rewrite with component architecture, route map, sequence diagrams, and state management reference</li>
                <li className="text-sm text-gray-600">SECURITY.md rewritten to reflect all active security controls including tokenVersion, OTP hashing, OAuth code exchange, Paystack verification, and cron protection</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.22.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.22.0 - 2026-05-20</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-red-600" />
                <h3 className="font-medium text-[#0a0a0a]">Security — 17 vulnerabilities fixed</h3>
              </div>
              <ul className="space-y-1 columns-1 md:columns-2">
                <li className="text-sm text-gray-600">OAuth tokens no longer placed in redirect URL; stored in OAuthSession, exchanged via one-time code</li>
                <li className="text-sm text-gray-600">tokenVersion added to all JWTs; incremented on logout and password change</li>
                <li className="text-sm text-gray-600">OTPs hashed with SHA-256 before storage; only hash persisted</li>
                <li className="text-sm text-gray-600">OTP invalidated after 5 failed attempts</li>
                <li className="text-sm text-gray-600">Paystack verified amount compared to server-calculated order total</li>
                <li className="text-sm text-gray-600">Newsletter subscribers scoped to organization</li>
                <li className="text-sm text-gray-600">forgotPassword returns same response whether account exists or not</li>
                <li className="text-sm text-gray-600">SSRF guard on downloadable product file URLs</li>
                <li className="text-sm text-gray-600">changePassword enforces full complexity rules</li>
                <li className="text-sm text-gray-600">acceptInvite password requires special character</li>
                <li className="text-sm text-gray-600">upload-file endpoint has explicit MIME allowlist</li>
                <li className="text-sm text-gray-600">notFound middleware registered before error handler</li>
                <li className="text-sm text-gray-600">Startup validation for 5 required env vars</li>
                <li className="text-sm text-gray-600">Removed withCredentials: true from Axios</li>
                <li className="text-sm text-gray-600">Morgan uses short format in production</li>
                <li className="text-sm text-gray-600">GET /api/staff restricted to AUDITOR+</li>
                <li className="text-sm text-gray-600">Deleted unauthenticated POST /api/auth/google endpoint</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.21.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.21.0 - 2026-05-19</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-[#0a0a0a]">Added</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Daily Vercel Cron job to prevent Supabase database pausing (GET /api/cron/ping at 06:00 UTC)</li>
                <li className="text-sm text-gray-600">CRON_SECRET environment variable with Bearer header validation</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-orange-600" />
                <h3 className="font-medium text-[#0a0a0a]">Fixed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">White navbar now applied immediately on page load for /system, /changelog, /security, /license, /contributing, /privacy, /terms (previously required scroll)</li>
                <li className="text-sm text-gray-600">Footer 5-column desktop layout: all five sections now appear in a single row</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.20.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.20.0 - 2026-05-17</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-[#0a0a0a]">Added</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Delete confirmation modal on Reviews page</li>
                <li className="text-sm text-gray-600">Category pill on store product cards</li>
                <li className="text-sm text-gray-600">Total review count on store product cards</li>
                <li className="text-sm text-gray-600">Downloadable product email attachments</li>
                <li className="text-sm text-gray-600">Invited user registration block</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-[#0a0a0a]">Changed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Google OAuth and email/password login are no longer mutually exclusive</li>
                <li className="text-sm text-gray-600">Mobile padding on all landing page sections</li>
                <li className="text-sm text-gray-600">Mobile padding on all dashboard pages</li>
                <li className="text-sm text-gray-600">Mobile padding on store pages</li>
                <li className="text-sm text-gray-600">Hero image column mobile padding</li>
                <li className="text-sm text-gray-600">FAQ answers rewritten</li>
                <li className="text-sm text-gray-600">Footer mobile layout</li>
                <li className="text-sm text-gray-600">Email footer formatting</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-orange-600" />
                <h3 className="font-medium text-[#0a0a0a]">Fixed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">5.0 default rating bug</li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.19.0 - 2026-05-12</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-[#0a0a0a]">Added</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Approval/rejection confirmation modals on Reviews page</li>
                <li className="text-sm text-gray-600">Mark-delivered confirmation modal on Logistics page</li>
                <li className="text-sm text-gray-600">Quick Links card after charts on Overview page</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-[#0a0a0a]">Changed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">New manual order initial status is now APPROVED</li>
                <li className="text-sm text-gray-600">Traqify brand logo in all platform email templates</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-orange-600" />
                <h3 className="font-medium text-[#0a0a0a]">Fixed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Report routes audit</li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.18.0 - 2026-05-12</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-[#0a0a0a]">Added</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Per-chart independent period filters on Overview page</li>
                <li className="text-sm text-gray-600">Quick Links card on Overview page</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-orange-600" />
                <h3 className="font-medium text-[#0a0a0a]">Fixed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Downloadable file upload 500 error</li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.17.0 - 2026-05-12</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-[#0a0a0a]">Added</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Publish confirmation modal on Add Product page</li>
                <li className="text-sm text-gray-600">Save confirmation modal on Edit Product page</li>
                <li className="text-sm text-gray-600">Dedicated downloadable file upload endpoint</li>
                <li className="text-sm text-gray-600">Unified product edit page</li>
                <li className="text-sm text-gray-600">Product category immutability</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-[#0a0a0a]">Changed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Products list page</li>
                <li className="text-sm text-gray-600">Downloadable file upload</li>
                <li className="text-sm text-gray-600">Mobile-first responsive layout across all dashboard pages</li>
                <li className="text-sm text-gray-600">Mobile sidebar</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-orange-600" />
                <h3 className="font-medium text-[#0a0a0a]">Fixed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Upload 400 on downloadable file</li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.16.0 - 2026-05-12</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-[#0a0a0a]">Added</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">60-day chart period</li>
                <li className="text-sm text-gray-600">Revenue growth "New this month" indicator</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-[#0a0a0a]">Changed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">getRevenueChart migrated from $queryRaw to findMany</li>
                <li className="text-sm text-gray-600">getCustomerChart baseline seeding</li>
                <li className="text-sm text-gray-600">createOrder payment is inside the transaction</li>
                <li className="text-sm text-gray-600">Overview period change re-fetches KPI cards</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-orange-600" />
                <h3 className="font-medium text-[#0a0a0a]">Fixed</h3>
              </div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Customer source on store checkout</li>
                <li className="text-sm text-gray-600">Revenue chart missing store-checkout revenue</li>
                <li className="text-sm text-gray-600">getCustomerChart Y-axis starting at 0</li>
              </ul>
            </div>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
}
