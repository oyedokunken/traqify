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

        {/* v1.15.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.15.0 - 2025-05-27</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Manual order: inline customer creation (Walk-in, Existing, New customer picker)</li>
                <li className="text-sm text-gray-600">Manual order: customer confirmation email when new customer provides email</li>
                <li className="text-sm text-gray-600">Shared storeOrderConfirmationEmailTemplate for dashboard and store checkout</li>
                <li className="text-sm text-gray-600">Product average rating computed from approved reviews on list and store endpoints</li>
                <li className="text-sm text-gray-600">Rating displayed as "4.8/5.0" on dashboard, store cards, and product detail page</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">All email templates standardised to white mode; emojis removed</li>
                <li className="text-sm text-gray-600">Store-facing emails moved to wrapStoreEmail wrapper</li>
                <li className="text-sm text-gray-600">Overview charts converted to ComposedChart (Bar + Area gradient)</li>
                <li className="text-sm text-gray-600">updateOrderStatus passes org contact to email templates</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Product star rating showing count instead of average</li>
                <li className="text-sm text-gray-600">Store product detail review list format</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.14.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.14.0 - 2025-05-11</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Payment auto-backfill: GET /api/payments auto-creates Payment records for COMPLETED/APPROVED orders with no record on first load</li>
                <li className="text-sm text-gray-600">Dashboard order creation now immediately creates a COMPLETED Payment record</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Overview revenue aggregates Payment.amount (status=COMPLETED) instead of Order.totalAmount</li>
                <li className="text-sm text-gray-600">Revenue and customer charts fill full date range with zeros for missing days</li>
                <li className="text-sm text-gray-600">All chart Y-axes start at 0; period change refreshes KPI cards</li>
                <li className="text-sm text-gray-600">Window focus refresh re-fetches all overview data</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Payments page empty for existing orders before Payment model introduction</li>
                <li className="text-sm text-gray-600">Revenue chart missing store-checkout revenue</li>
                <li className="text-sm text-gray-600">Customer chart starting above 0</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.13.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.13.0 - 2025-05-13</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Payments auto-creation on store checkout (PENDING for transfer, COMPLETED for Paystack)</li>
                <li className="text-sm text-gray-600">Staff removal notification email</li>
                <li className="text-sm text-gray-600">Customer view modal with contact info and up to 5 recent orders</li>
                <li className="text-sm text-gray-600">Reviews stats cards: total, average, pending, approved</li>
                <li className="text-sm text-gray-600">Review order context displays linked order number</li>
                <li className="text-sm text-gray-600">Newsletter CSV export now includes Status column</li>
                <li className="text-sm text-gray-600">Audit Logs report card with PDF download on Reports page</li>
                <li className="text-sm text-gray-600">Audit Logs PDF report type with date-range filter</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Reports 400 guard removed; empty PDFs render "No data available" instead</li>
                <li className="text-sm text-gray-600">Audit log detail page: full-width, responsive padding, wider meta grid</li>
                <li className="text-sm text-gray-600">Footer newsletter form migrated to react-hook-form + zod</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Payments page empty (no Payment record created at checkout)</li>
                <li className="text-sm text-gray-600">Reports 400 on empty date range</li>
                <li className="text-sm text-gray-600">order.controller.ts type error on newOrderEmailTemplate</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.11.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.11.0 - 2025-05-10</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Staff page: pending invite badges and Cancel invite action</li>
                <li className="text-sm text-gray-600">Lazy expiry detection in getInvites with audit log entry</li>
                <li className="text-sm text-gray-600">Payments and Customers pages: modal overlay for add actions</li>
                <li className="text-sm text-gray-600">First-time welcome modal with role-specific message for invited members</li>
                <li className="text-sm text-gray-600">Invite accept page redesigned: header inside card, left-aligned, eye icon on confirm field</li>
                <li className="text-sm text-gray-600">Settings Company tab now visible to all roles (read-only for non-OWNER)</li>
                <li className="text-sm text-gray-600">Password change rejects passwords containing name or email</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Staff invite expiry extended from 48 hours to 3 days</li>
                <li className="text-sm text-gray-600">Email template invite copy updated to "3 days"</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Review controller: added error logging for Vercel function logs</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.10.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.10.0 - 2026-05-10</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Profile: phone and role fields in Settings (2x2 grid; role is immutable)</li>
                <li className="text-sm text-gray-600">Payments report PDF with reference, method, amount, status, order, date columns</li>
                <li className="text-sm text-gray-600">Payment Tracking feature card on landing page</li>
                <li className="text-sm text-gray-600">Audit log row click navigates to detail page</li>
                <li className="text-sm text-gray-600">Audit log mark-read success modal</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Report PDF tagline: "Enterprise Store Management System"</li>
                <li className="text-sm text-gray-600">Notification bell limited to 3 recent notifications; compact single-line format</li>
                <li className="text-sm text-gray-600">Overview header: Open Storefront button and live clock inline on all screen sizes</li>
                <li className="text-sm text-gray-600">Em dashes removed from all source files and documentation</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Prisma client regenerated after Payment model confirmation</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.9.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.9.0 - 2026-05-10</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Payments module: Payment model, backend CRUD, frontend page with summary cards, filter, paginated table, inline status update modal</li>
                <li className="text-sm text-gray-600">Payments report card on Reports page</li>
                <li className="text-sm text-gray-600">Audit log detail page: /dashboard/[slug]/audit-logs/[id]</li>
                <li className="text-sm text-gray-600">Notification bell in topbar with dropdown (6 recent logs, unread count, mark all read)</li>
                <li className="text-sm text-gray-600">Inventory filters: category and stock-status dropdowns</li>
                <li className="text-sm text-gray-600">Store publish validation checks logo, description, email, published products, and categories</li>
                <li className="text-sm text-gray-600">Customer source badge: PURCHASE (Auto) vs MANUAL</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Registration flow calls login() from auth context after org creation; no re-login required</li>
                <li className="text-sm text-gray-600">Overview welcome modal guarded by user?.organizationId</li>
                <li className="text-sm text-gray-600">Sidebar nav order: enterprise-logical ordering</li>
                <li className="text-sm text-gray-600">Sidebar Audit Logs: MANAGER added to allowed roles</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Store togglePublish syntax: missing closing brace</li>
                <li className="text-sm text-gray-600">Products page missing Link import</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.7.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.7.0 - 2026-05-10</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">OTP-first registration: Step 1 sends a verification code before personal or org details are collected</li>
                <li className="text-sm text-gray-600">Google auth indicator in Settings: Security tab shows "Signed in with Google"; password change hidden for Google accounts</li>
                <li className="text-sm text-gray-600">Low-stock email alerts to org OWNER when inventory falls at or below threshold</li>
                <li className="text-sm text-gray-600">Comprehensive audit logging: report email export, store publish/unpublish toggle</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Register step 2/3 flow: JWT stored in React state, re-login after org creation; no manual sign-in required</li>
                <li className="text-sm text-gray-600">verifyEmail handles pre-existing OTP-first flow</li>
                <li className="text-sm text-gray-600">Product images on dashboard and store changed to object-cover</li>
                <li className="text-sm text-gray-600">Org logo uploads go to Supabase avatars bucket; local uploads folder removed</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">sendOTP 404 when email had no existing account</li>
                <li className="text-sm text-gray-600">Register skipping org creation (was writing tokens and redirecting immediately)</li>
                <li className="text-sm text-gray-600">JWT missing organizationId after org creation</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.6.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.6.0 - 2026-05-08</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Product reviews: Review model, moderation dashboard, post-checkout submission, public review grid</li>
                <li className="text-sm text-gray-600">Reviews dashboard page: tabbed PENDING/APPROVED/REJECTED, search, approve/reject/delete</li>
                <li className="text-sm text-gray-600">Review count badge on dashboard product cards and public store grid</li>
                <li className="text-sm text-gray-600">Staff page role and status filters</li>
                <li className="text-sm text-gray-600">Newsletter refresh modal with subscriber stats summary</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">RBAC hierarchy corrected: AUDITOR (2) above CASHIER (1)</li>
                <li className="text-sm text-gray-600">Sidebar Customers visible to AUDITOR</li>
                <li className="text-sm text-gray-600">Overview API uses safe Prisma findMany for low-stock query</li>
                <li className="text-sm text-gray-600">Store logo links to org website when set</li>
                <li className="text-sm text-gray-600">Settings layout: Name/Email and Website/Description as 50/50 desktop grids</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Overview undefined% / undefined total orders</li>
                <li className="text-sm text-gray-600">CASHIER incorrectly accessing financial reports</li>
                <li className="text-sm text-gray-600">Newsletter modal JSX syntax</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.4.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.4.0 - 2026-05-08</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Newsletter dashboard: subscriber stats, searchable table, CSV export (OWNER/MANAGER)</li>
                <li className="text-sm text-gray-600">Admin new-order notification email to org OWNER</li>
                <li className="text-sm text-gray-600">Overview: Open Storefront button (shows error modal if store is unpublished)</li>
                <li className="text-sm text-gray-600">Overview: 7/30/90-day chart period filter</li>
                <li className="text-sm text-gray-600">Products: type filter and type pill badge</li>
                <li className="text-sm text-gray-600">Store description field on Organization; rendered in public store info banner</li>
                <li className="text-sm text-gray-600">Store sort bar: Newest, Oldest, Price, Name A-Z</li>
                <li className="text-sm text-gray-600">RBAC hardening: removeStaff and resetStaffPassword return 403 for OWNER targets</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Orders page: table rows fully clickable; action buttons stop propagation</li>
                <li className="text-sm text-gray-600">Settings: description field included in org form defaults and schema</li>
                <li className="text-sm text-gray-600">Sidebar: "Store" renamed to "Storefront"; Newsletter nav item added</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Invite accept redirect using wrong slug field</li>
                <li className="text-sm text-gray-600">initialStock / lowStockAlert validation (missing valueAsNumber)</li>
                <li className="text-sm text-gray-600">updateOrgSchema missing industry and size fields</li>
                <li className="text-sm text-gray-600">Logistics order count not filtering by APPROVED status</li>
                <li className="text-sm text-gray-600">Admin order email orgOwner.email missing from select</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.3.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.3.0 - 2026-05-08</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Audit log: LOGIN, CREATE/Order (store checkout), EXPORT/Report events</li>
                <li className="text-sm text-gray-600">Audit log frontend: entity map extended with ProductCategory and StaffInvite</li>
                <li className="text-sm text-gray-600">Order status emails: orderApprovedEmailTemplate and orderCompletedEmailTemplate</li>
                <li className="text-sm text-gray-600">Low-stock email alert to org OWNER on inventory update</li>
                <li className="text-sm text-gray-600">Customer chart API: GET /api/reports/customer-chart</li>
                <li className="text-sm text-gray-600">Variable product attributes UI on /products/new</li>
                <li className="text-sm text-gray-600">Downloadable product toggle: URL tab or file upload tab</li>
                <li className="text-sm text-gray-600">Store checkout audit log via org owner ID</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Google Fonts migrated to next/font/google (self-hosted at build time)</li>
                <li className="text-sm text-gray-600">Overview order bar chart replaced with AreaChart; customer chart uses real API data</li>
                <li className="text-sm text-gray-600">Product card images: object-cover (no whitespace)</li>
                <li className="text-sm text-gray-600">backend/.env.example fully rewritten with section headers and dashboard links</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">CORS broken in production (FRONTEND_URL not set on Vercel)</li>
                <li className="text-sm text-gray-600">All API calls failing in production (NEXT_PUBLIC_API_URL not set)</li>
                <li className="text-sm text-gray-600">Google OAuth redirect_uri_mismatch</li>
                <li className="text-sm text-gray-600">Express rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR</li>
                <li className="text-sm text-gray-600">SMTP cold-start noise from transporter.verify()</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.2.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.2.0 - 2026-05-08</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Supabase Storage: product images, org logos, user avatars</li>
                <li className="text-sm text-gray-600">Wishlist system: localStorage + backend sync, email capture, reminder emails (30min, 2hr, 1 day, 3 days)</li>
                <li className="text-sm text-gray-600">Logistics page: APPROVED orders as cards with Mark delivered button</li>
                <li className="text-sm text-gray-600">APPROVED order status with quick-approve button</li>
                <li className="text-sm text-gray-600">Product type field: SIMPLE, DOWNLOADABLE, VARIABLE with downloadUrl</li>
                <li className="text-sm text-gray-600">Store info section: org details below products, linkable via #store-info</li>
                <li className="text-sm text-gray-600">Store off-canvas mobile menu with category nav and cart/wishlist counts</li>
                <li className="text-sm text-gray-600">Product detail drawer: image gallery, thumbnail strip, wishlist toggle</li>
                <li className="text-sm text-gray-600">User avatar upload via POST /api/auth/upload-avatar</li>
                <li className="text-sm text-gray-600">Open Graph image and updated favicon (Traqify grid mark)</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Public store layout: 2-column (filter sidebar + products) replacing 3-column</li>
                <li className="text-sm text-gray-600">updateOrderStatus now accepts APPROVED status</li>
                <li className="text-sm text-gray-600">getStoreProducts filters published status and returns org contact fields</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Old favicon replaced with correct grid logo mark</li>
                <li className="text-sm text-gray-600">Footer links overflow on mobile</li>
                <li className="text-sm text-gray-600">imageUrl shown twice on hover cycle (deduped with Array.from(new Set(...)))</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.1.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.1.0 - 2026-05-08</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Added</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Product categories: backend CRUD, admin page /dashboard/[slug]/categories, sidebar nav</li>
                <li className="text-sm text-gray-600">Multi-image products: up to 4 images, first is cover, stored in imageUrls[]</li>
                <li className="text-sm text-gray-600">Auto-SKU generation from product name</li>
                <li className="text-sm text-gray-600">Product status: published / draft + isActive toggle</li>
                <li className="text-sm text-gray-600">Store management page: /dashboard/[slug]/store with publish toggle and URL copy</li>
                <li className="text-sm text-gray-600">Reports redesign: 6 report type cards, PDF download and email modal</li>
                <li className="text-sm text-gray-600">Backend PDF generation with PDFKit for all report types</li>
                <li className="text-sm text-gray-600">Pagination on Products (20/page) and Customers (25/page) pages</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-[#0a0a0a]">Changed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">getProducts returns paginated results with total count</li>
                <li className="text-sm text-gray-600">getCustomers returns paginated results with server-side search</li>
                <li className="text-sm text-gray-600">sendEmail updated to support optional attachments array</li>
                <li className="text-sm text-gray-600">Store routes filter published products and return category data</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3"><Bug className="w-4 h-4 text-orange-600" /><h3 className="font-medium text-[#0a0a0a]">Fixed</h3></div>
              <ul className="space-y-1">
                <li className="text-sm text-gray-600">Sidebar Staff nav item had wrong icon</li>
                <li className="text-sm text-gray-600">Report controller items include renamed to orderItems</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* v1.0.0 */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">v1.0.0 - 2025-05-07</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 md:col-span-2">
              <div className="flex items-center gap-2 mb-3"><PlusCircle className="w-4 h-4 text-green-600" /><h3 className="font-medium text-[#0a0a0a]">Initial release</h3></div>
              <ul className="space-y-1 columns-1 md:columns-2">
                <li className="text-sm text-gray-600">Multi-tenant organization system with OWNER, MANAGER, CASHIER, AUDITOR roles</li>
                <li className="text-sm text-gray-600">JWT authentication with refresh tokens and OTP email verification</li>
                <li className="text-sm text-gray-600">Google OAuth 2.0 redirect-based sign-in</li>
                <li className="text-sm text-gray-600">Product management: create, edit, deactivate, image upload</li>
                <li className="text-sm text-gray-600">Inventory management: stock tracking, low-stock alerts, adjustments</li>
                <li className="text-sm text-gray-600">Order management: POS-style creation, detail modal, status tracking</li>
                <li className="text-sm text-gray-600">Customer management with full purchase history and profile</li>
                <li className="text-sm text-gray-600">Staff management: email invitations, role assignment, account restriction</li>
                <li className="text-sm text-gray-600">Public store page per org with product catalog, cart, and guest checkout</li>
                <li className="text-sm text-gray-600">Real-time revenue and order analytics dashboard (role-based, Recharts)</li>
                <li className="text-sm text-gray-600">Audit log system: every action logged with user, timestamp, and details</li>
                <li className="text-sm text-gray-600">Settings page: profile update, password change, org management</li>
                <li className="text-sm text-gray-600">Reports page: date-range sales report with totals</li>
                <li className="text-sm text-gray-600">Branded HTML email templates: OTP, password reset, welcome, invite, order confirmation</li>
                <li className="text-sm text-gray-600">Newsletter subscription with confirmation email</li>
                <li className="text-sm text-gray-600">Full landing page: Hero, Features, Stats, HowItWorks, Testimonials, FAQ, CTA</li>
                <li className="text-sm text-gray-600">Shared Navbar with mobile menu and Google login button</li>
                <li className="text-sm text-gray-600">Footer with newsletter subscription form, social links, payment methods</li>
                <li className="text-sm text-gray-600">Privacy Policy and Terms of Service pages</li>
                <li className="text-sm text-gray-600">Custom 404 Not Found page</li>
              </ul>
            </div>
          </div>
        </motion.section>

      </div>

      <Footer />
    </div>
  );
}
