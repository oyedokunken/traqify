"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Shield, Users, Box, BarChart3, Mail, Lock, Database, Code2, Globe, Zap, CheckCircle2, Server, FileText, Terminal, GitBranch, AlertTriangle, Bug, Wrench, PlusCircle, Key, Upload, Eye } from "lucide-react";

export default function SystemPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-[#DE1010] py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <nav className="flex items-center justify-center gap-2 text-sm text-white/80 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">The System</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">The System</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              A production-deployed, multi-tenant enterprise store management platform built for retail businesses that need structure, auditability, and role-based control across their operations.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Cpu className="w-6 h-6 text-[#DE1010]" />
            What is Traqify?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Traqify is a full-stack TypeScript monorepo (a Next.js 14 App Router frontend + RESTful Express.js backend covering the complete retail lifecycle: product catalogue, POS order creation, inventory control, customer records, payment tracking, staff access management, public storefronts with Paystack checkout, financial reports, and a real-time analytics dashboard.
          </p>
          <p className="text-gray-600 leading-relaxed">
            The system is live at <a href="https://traqify.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#DE1010] hover:underline">https://traqify.vercel.app</a> and its API at <a href="https://traqify-api.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#DE1010] hover:underline">https://traqify-api.vercel.app</a>.
          </p>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Code2 className="w-6 h-6 text-[#DE1010]" />
            Architecture
          </h2>
          <div className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto mb-6">
            <pre className="text-xs sm:text-sm whitespace-pre">
{`                              CLIENT
              +--------------------------------------+
              |    Next.js 14 (App Router)  :3000    |
              |  TypeScript + Tailwind + Framer      |
              |  Axios client (JWT + auto-refresh)   |
              +------------------+-------------------+
                                 |
                    HTTP/HTTPS   |   REST JSON API
                                 |
              +------------------v-------------------+
              |    Express.js API Server  :5000       |
              |  TypeScript + Prisma ORM              |
              |  JWT middleware + RBAC middleware      |
              +------+----------+--------------------+
                     |          |
         +-----------+          +-----------+
         |                                  |
+--------v-----------+          +-----------v-----------+
|  PostgreSQL (via   |          |  Supabase Storage      |
|  Supabase)         |          |  (product images,      |
|                    |          |   avatars)             |
|  Prisma ORM        |          +-----------------------+
+--------------------+
         |
+--------v-----------+
|  Nodemailer        |
|  Gmail SMTP        |
|  HTML email        |
|  templates         |
+--------------------+

  AUTHENTICATION FLOWS
  ----------------------
  Email/Password (OTP-first flow):
    1. POST /send-otp -> OTP email (works before user exists)
    2. POST /verify-email -> validate code -> redirect /register?verifiedEmail=...
    3. POST /register -> create user (emailVerified:true) -> JWT (React state only)
    4. POST /organizations -> create org -> POST /login -> fresh JWT with orgId
       -> redirect /dashboard/[slug]/overview

  Google OAuth 2.0:
    GET /google-redirect -> accounts.google.com
    -> GET /google-callback?code= -> exchange code -> userinfo
    -> upsert user -> JWT + redirect to /auth-callback

  Token Refresh:
    Axios 401 interceptor -> POST /auth/refresh -> new access token
    Automatic, transparent to all callers`}
            </pre>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-[#DE1010]" />
                <h3 className="font-medium text-[#0a0a0a]">Frontend</h3>
              </div>
              <p className="text-sm text-gray-600">Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-[#DE1010]" />
                <h3 className="font-medium text-[#0a0a0a]">Backend</h3>
              </div>
              <p className="text-sm text-gray-600">Express.js, TypeScript, Prisma ORM, JWT, bcrypt</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-[#DE1010]" />
                <h3 className="font-medium text-[#0a0a0a]">Database</h3>
              </div>
              <p className="text-sm text-gray-600">PostgreSQL (hosted on Supabase)</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-[#DE1010]" />
                <h3 className="font-medium text-[#0a0a0a]">Storage</h3>
              </div>
              <p className="text-sm text-gray-600">Supabase Storage for product images and avatars</p>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Zap className="w-6 h-6 text-[#DE1010]" />
            Tech Stack
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Concern</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Technology</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Frontend framework</td><td className="px-4 py-3 text-sm text-gray-600">Next.js 14</td><td className="px-4 py-3 text-sm text-gray-600">App Router, SSR + Client Components</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Language</td><td className="px-4 py-3 text-sm text-gray-600">TypeScript 5</td><td className="px-4 py-3 text-sm text-gray-600">Strict mode, full type coverage</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Styling</td><td className="px-4 py-3 text-sm text-gray-600">Tailwind CSS 3</td><td className="px-4 py-3 text-sm text-gray-600">JIT, custom config</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">UI primitives</td><td className="px-4 py-3 text-sm text-gray-600">Radix UI / shadcn/ui</td><td className="px-4 py-3 text-sm text-gray-600">Accessible, unstyled components</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Animations</td><td className="px-4 py-3 text-sm text-gray-600">Framer Motion</td><td className="px-4 py-3 text-sm text-gray-600">Page transitions, scroll animations, charts</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Charts</td><td className="px-4 py-3 text-sm text-gray-600">Recharts</td><td className="px-4 py-3 text-sm text-gray-600">AreaChart, BarChart, PieChart</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">HTTP client</td><td className="px-4 py-3 text-sm text-gray-600">Axios</td><td className="px-4 py-3 text-sm text-gray-600">Interceptors for JWT + token refresh</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Backend framework</td><td className="px-4 py-3 text-sm text-gray-600">Express.js 4</td><td className="px-4 py-3 text-sm text-gray-600">TypeScript, modular routes</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">ORM</td><td className="px-4 py-3 text-sm text-gray-600">Prisma</td><td className="px-4 py-3 text-sm text-gray-600">Type-safe queries, migrations via db push</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Database</td><td className="px-4 py-3 text-sm text-gray-600">PostgreSQL</td><td className="px-4 py-3 text-sm text-gray-600">Hosted on Supabase</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Auth</td><td className="px-4 py-3 text-sm text-gray-600">JWT + bcrypt</td><td className="px-4 py-3 text-sm text-gray-600">Access + refresh token pair</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">OAuth</td><td className="px-4 py-3 text-sm text-gray-600">Google OAuth 2.0</td><td className="px-4 py-3 text-sm text-gray-600">Redirect-based (no popup)</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">File storage</td><td className="px-4 py-3 text-sm text-gray-600">Supabase Storage</td><td className="px-4 py-3 text-sm text-gray-600">Product images, avatars</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Email</td><td className="px-4 py-3 text-sm text-gray-600">Nodemailer</td><td className="px-4 py-3 text-sm text-gray-600">Gmail SMTP, HTML templates</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Security</td><td className="px-4 py-3 text-sm text-gray-600">Helmet, rate-limit</td><td className="px-4 py-3 text-sm text-gray-600">Per-route rate limiting on auth endpoints</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">File upload</td><td className="px-4 py-3 text-sm text-gray-600">Multer (memoryStorage)</td><td className="px-4 py-3 text-sm text-gray-600">Images: JPG/PNG/WebP max 2 MB; downloadable files: any type max 4 MB</td></tr>
                <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600">Font</td><td className="px-4 py-3 text-sm text-gray-600">Jost</td><td className="px-4 py-3 text-sm text-gray-600">Google Fonts</td></tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Zap className="w-6 h-6 text-[#DE1010]" />
            Key Features
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-[#DE1010]" /> Multi-tenancy</h3>
              <p className="text-gray-600 leading-relaxed">Every database query — products, orders, customers, staff, payments, audit logs — is scoped by organizationId. No query runs without it. There is no global admin view; isolation is enforced at the ORM layer, not in frontend logic alone. The system supports creating multiple separate organizations (e.g., separate branches) under different slugs.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-[#DE1010]" /> Role-Based Access Control (RBAC)</h3>
              <p className="text-gray-600 leading-relaxed mb-4">Four roles with granular middleware enforcement:</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 mb-4">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Role</th><th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Capabilities</th></tr></thead>
                  <tbody>
                    <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600 font-medium">OWNER</td><td className="px-4 py-3 text-sm text-gray-600">Full access: all modules, staff management, org settings, audit logs</td></tr>
                    <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600 font-medium">MANAGER</td><td className="px-4 py-3 text-sm text-gray-600">Products, inventory, orders, customers, staff invitations</td></tr>
                    <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600 font-medium">CASHIER</td><td className="px-4 py-3 text-sm text-gray-600">Create orders, view own transactions, browse product catalog</td></tr>
                    <tr className="border-t"><td className="px-4 py-3 text-sm text-gray-600 font-medium">AUDITOR</td><td className="px-4 py-3 text-sm text-gray-600">Read-only access to all data, audit logs, financial reports</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-[#DE1010]" /> Authentication</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Email + password with OTP email verification (6-digit, 10-minute expiry)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Google OAuth 2.0 via redirect flow (no third-party popups)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>JWT access token (7-day default) + refresh token pair</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Axios interceptor catches 401 and silently refreshes the token</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Account lock by admin with notification email</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><Box className="w-5 h-5 text-[#DE1010]" /> Products and Inventory</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Create products with name, SKU, category, price, compare-at price, description</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Product types: SIMPLE, DOWNLOADABLE (download URL or direct file upload), VARIABLE (attribute builder)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Multi-image support: up to 4 images per product; first image is cover; drag-to-reorder</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Auto-SKU generation from product name</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Image upload (JPG / PNG / WebP, max 2 MB) to Supabase Storage (products bucket)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Downloadable file upload via dedicated POST /api/products/upload-file endpoint (any MIME type, max 4 MB)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Edit page at /products/[id]/edit with full feature parity to Add Product; category is immutable after creation</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Publish confirmation modal on Add Product when status is set to Published</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Save confirmation modal on Edit Product before any save; adapts text for publish vs draft saves</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Per-product inventory with configurable low-stock alert threshold</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Inventory adjustment log</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Low-stock dashboard badge</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Category management page (/dashboard/[slug]/categories)</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#DE1010]" /> Orders</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>POS-style order creation: search products, set quantities, attach customers</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Order status flow: PENDING → APPROVED → COMPLETED / CANCELLED</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Clickable rows — click anywhere on a row to open the order detail modal</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Approve confirmation modal before status change; delete confirmation modal</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Inventory auto-decremented on order creation</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Order detail modal with full item and customer breakdown</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Email confirmation to customer with org branding (logo, org name)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Admin email notification to the org owner when any new order is placed (dashboard or store)</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-[#DE1010]" /> Public Store</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Each org gets /store/[slug] as a public product catalog</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Responsive: mobile off-canvas drawer menu with category nav, cart/wishlist counts</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Store navbar: full-width logo (or text fallback), cart badge, wishlist badge, category tabs (desktop)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Store info section below products: org name, description, and contact details linkable via #store-info</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Filters: keyword search, category (left sidebar), dual price range slider (min/max derived from actual product prices)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Sort bar: Newest first, Oldest, Price (low→high / high→low), Name (A–Z)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Product cards: hover image cycling, wishlist heart overlay, discount % badge; separate View / Add-to-cart / Wishlist actions; object-contain images</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Product detail drawer: image gallery with thumbnail strip, wishlist toggle, Add to cart</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Wishlist: localStorage + backend sync; email capture; reminder emails at 30min/2hr/1day/3days</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Cart with quantity controls; scroll-to-top button</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Checkout: breadcrumb navigation, arithmetic CAPTCHA security check, Paystack payment popup, Secured by Paystack badge</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Paystack payment: inline popup (no redirect), backend verification before order creation; successful payments create orders as APPROVED</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Confirmation email to customer on order placement</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#DE1010]" /> Analytics Dashboard</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Live clock (HH:MM:SS) and timezone displayed next to the greeting and date — updates every second</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Period filter on charts: 7 / 30 / 90 days (applies to revenue, orders, and customer growth charts simultaneously)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Open Storefront button — opens the public store in a new tab; shows a modal if the store is unpublished with a direct link to publish</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Revenue area chart, order growth area chart, customer growth line chart — all powered by live API data</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Low-stock alert banner when any product is at or below alert threshold</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>First-time welcome modal: role-aware — owners see setup instructions; invited members see their role and access scope</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Welcome-back modal on every new session (sessionStorage-gated)</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-[#DE1010]" /> Audit Logs</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Every create / update / delete / login event logged with: user ID, organization ID, action type, entity name, entity ID, human-readable detail, IP address, user agent, and timestamp</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Captures: product creates/edits, order status changes, customer updates, staff invites sent/accepted/cancelled/expired, password changes, account restrictions, report exports</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Searchable and paginated; clickable rows navigate to a full detail page</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Read/unread state per log entry; bulk mark-read with confirmation modal</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Notification bell in topbar: shows latest 3 unread audit events; click navigates to detail</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Visible to OWNER and AUDITOR only</span></li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Lock className="w-6 h-6 text-[#DE1010]" />
            Security Model
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">Authentication layers</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>OTP email verification — every new account must verify their email before gaining access; the OTP is a 6-digit code with a 10-minute expiry and single-use enforcement</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>bcrypt password hashing — cost factor 12; no plain-text passwords stored anywhere</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>JWT access token — 7-day default lifetime; signed with JWT_SECRET; carries userId, email, organizationId, role</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>JWT refresh token — separate secret (JWT_REFRESH_SECRET); used by Axios interceptor to silently re-issue access tokens on 401</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Google OAuth 2.0 — redirect-based flow (server-side code exchange); email/password and Google OAuth are not mutually exclusive</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Invited user registration block — users with a pending staff invitation cannot create new accounts via registration or Google OAuth; they must use their invitation link or sign in</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">Authorization layers</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>authenticate middleware — verifies the JWT on every protected route; attaches req.user</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>requireOrg middleware — enforces that req.user.organizationId is set; prevents cross-org access</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>RBAC middleware — four guards: isOwnerOnly, isOwnerOrManager, isAtLeastAuditor, isAtLeastCashier; applied per-route, not per-controller</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Data-layer isolation — all Prisma queries include organizationId in the where clause; no query trusts the frontend to scope data</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">Rate limiting</h3>
              <p className="text-gray-600">Auth endpoints (/api/auth/*) are rate-limited via express-rate-limit: 10 requests per 15 minutes per IP on sensitive routes (login, register, OTP send).</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">HTTP security headers</h3>
              <p className="text-gray-600">helmet is applied globally: sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, X-XSS-Protection, and Content Security Policy headers.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">File upload security</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Only image/jpeg, image/png, image/webp MIME types accepted (validated server-side)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Max file size: 5 MB (enforced by Multer before the handler runs)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Files stored in Supabase Storage (not the server filesystem); server never persists files to disk</span></li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Database className="w-6 h-6 text-[#DE1010]" />
            Database Schema
          </h2>
          <div className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto text-xs sm:text-sm">
            <pre className="whitespace-pre">
{`User
  id, email, name, password (bcrypt), phone, avatarUrl
  emailVerified, signInMethod (EMAIL | GOOGLE)
  role (OWNER | MANAGER | CASHIER | AUDITOR)
  isActive Boolean                         -- account restriction flag
  organizationId (FK -> Organization)?
  invitedById (FK -> User)?                -- set when joined via invite
  lastLoginAt, createdAt

Organization
  id, name, slug (unique), email, phone, address, website
  industry, size, description?
  logoUrl?
  storePublished Boolean
  ownerId (FK -> User)

Product
  id, name, sku (unique per org)
  price, comparePrice?, description?
  imageUrl?, imageUrls String[]
  productType (SIMPLE | DOWNLOADABLE | VARIABLE)
  downloadUrl?
  status (published | draft), isActive Boolean
  categoryId (FK -> ProductCategory)
  organizationId

Inventory
  id, quantity Int, lowStockAlert Int
  productId (1:1 -> Product)

Order
  id, status (PENDING|APPROVED|COMPLETED|CANCELLED)
  totalAmount, paymentMethod?, notes?
  customerId?, organizationId, createdByUserId?

OrderItem
  id, productId, quantity, unitPrice, subtotal
  orderId

Payment
  id, amount Float, currency (default NGN)
  status (PENDING|COMPLETED|FAILED|REFUNDED)
  method?, reference?, notes?
  organizationId, orderId?

Customer
  id, name, email?, phone?, address?
  source (MANUAL | PURCHASE)
  organizationId

StaffInvite
  id, email, role, token (unique)
  status (PENDING | ACCEPTED | EXPIRED)
  expiresAt, organizationId, invitedById

Review
  id, orderId, productId, organizationId
  rating Int (1-5), comment?
  customerName, customerEmail?
  status (PENDING | APPROVED | REJECTED)
  @@unique([orderId, productId])

ProductCategory
  id, name, slug, description?
  organizationId

OTPCode
  id, email, code, expiresAt, used Boolean

PasswordResetToken
  id, email, token, expiresAt, used Boolean

AuditLog
  id, userId, organizationId
  action (CREATE | UPDATE | DELETE | LOGIN)
  entity String, entityId String, details String
  ipAddress?, userAgent?
  isRead Boolean (default false)
  createdAt

Wishlist
  id, sessionId, email?, productIds String[]
  slug, organizationId
  sent30min, sent2hr, sentDay1, sentDay3 Boolean
  createdAt

NewsletterSubscriber
  id, email, subscribedAt`}
            </pre>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Terminal className="w-6 h-6 text-[#DE1010]" />
            Running Locally
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">Prerequisites</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>Node.js 18 or higher</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>npm 9 or higher</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>A free Supabase project (PostgreSQL + Storage)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>A Gmail account with App Password enabled</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#DE1010] flex-shrink-0 mt-0.5" /><span>A Google Cloud project with OAuth 2.0 Web Client credentials</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">Step 1: Clone the repository</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">git clone https://github.com/oyedokunken/traqify.git<br/>cd traqify</code>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">Step 2: Set up the backend</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                <code className="text-sm">cd backend<br/>npm install<br/>cp .env.example .env</code>
              </div>
              <p className="text-gray-600 mb-4">Open .env and fill in the required environment variables (DATABASE_URL, DIRECT_URL, SMTP_USER, SMTP_PASS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, JWT_REFRESH_SECRET).</p>
              <p className="text-gray-600 mb-4">Push the schema to your database:</p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                <code className="text-sm">npx prisma db push</code>
              </div>
              <p className="text-gray-600 mb-4">Start the backend dev server:</p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">npm run dev</code>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-3">Step 3: Set up the frontend</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                <code className="text-sm">cd frontend<br/>npm install<br/>cp .env.local.example .env.local</code>
              </div>
              <p className="text-gray-600 mb-4">Fill in NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
              <p className="text-gray-600 mb-4">Start the frontend:</p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">npm run dev</code>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
}
