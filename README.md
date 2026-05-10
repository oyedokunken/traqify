<div align="center">

# Traqify

**Multi-tenant store management platform for retail businesses.**

[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express.js](https://img.shields.io/badge/Express.js_4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-EE4B96?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion)
[![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logoColor=white)](https://recharts.org)
[![JWT](https://img.shields.io/badge/JWT_Auth-F7C948?style=for-the-badge&logo=jsonwebtokens&logoColor=black)](https://jwt.io)
[![Google OAuth](https://img.shields.io/badge/Google_OAuth_2.0-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/identity)
[![Supabase](https://img.shields.io/badge/Supabase_Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## What is Traqify?

Traqify is a **production-deployed, multi-tenant enterprise store management platform** built for retail businesses that need structure, auditability, and role-based control across their operations.

It is a full-stack TypeScript monorepo (a Next.js 14 App Router frontend + RESTful Express.js backend covering the complete retail lifecycle: product catalogue, POS order creation, inventory control, customer records, payment tracking, staff access management, public storefronts with Paystack checkout, financial reports, and a real-time analytics dashboard.

The system is live at **[https://traqify.vercel.app](https://traqify.vercel.app)** and its API at **[https://traqify-api.vercel.app](https://traqify-api.vercel.app)**.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Folder Structure](#folder-structure)
7. [Running Locally](#running-locally)
8. [Environment Variables](#environment-variables)
9. [Google OAuth Setup](#google-oauth-setup)
10. [Deployment](#deployment)
11. [License](#license)

---

## Architecture

```
                              CLIENT
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
    Automatic, transparent to all callers
```

---

## Tech Stack

| Concern | Technology | Notes |
|---|---|---|
| Frontend framework | Next.js 14 | App Router, SSR + Client Components |
| Language | TypeScript 5 | Strict mode, full type coverage |
| Styling | Tailwind CSS 3 | JIT, custom config |
| UI primitives | Radix UI / shadcn/ui | Accessible, unstyled components |
| Animations | Framer Motion | Page transitions, scroll animations, charts |
| Charts | Recharts | AreaChart, BarChart, PieChart |
| HTTP client | Axios | Interceptors for JWT + token refresh |
| Backend framework | Express.js 4 | TypeScript, modular routes |
| ORM | Prisma | Type-safe queries, migrations via `db push` |
| Database | PostgreSQL | Hosted on Supabase |
| Auth | JWT + bcrypt | Access + refresh token pair |
| OAuth | Google OAuth 2.0 | Redirect-based (no popup) |
| File storage | Supabase Storage | Product images, avatars |
| Email | Nodemailer | Gmail SMTP, HTML templates |
| Security | Helmet, rate-limit | Per-route rate limiting on auth endpoints |
| Phone input | react-phone-number-input | International flag selector, default NG |
| PDF generation | PDFKit | Landscape A4 report PDFs |
| File upload | Multer (memoryStorage) | JPG/PNG/WebP; max 2 MB |
| Font | Jost | Google Fonts |

---

## Features

### Multi-tenancy

Every database query — products, orders, customers, staff, payments, audit logs — is scoped by `organizationId`. No query runs without it. There is no global admin view; isolation is enforced at the ORM layer, not in frontend logic alone. The system supports creating multiple separate organizations (e.g., separate branches) under different slugs.

### Role-Based Access Control (RBAC)
Four roles with granular middleware enforcement:

| Role | Capabilities |
|------|--------------|
| **OWNER** | Full access: all modules, staff management, org settings, audit logs |
| **MANAGER** | Products, inventory, orders, customers, staff invitations |
| **CASHIER** | Create orders, view own transactions, browse product catalog |
| **AUDITOR** | Read-only access to all data, audit logs, financial reports |

### Authentication
- Email + password with OTP email verification (6-digit, 10-minute expiry)
- Google OAuth 2.0 via redirect flow (no third-party popups)
- JWT access token (7-day default) + refresh token pair
- Axios interceptor catches 401 and silently refreshes the token
- Account lock by admin with notification email

### Products and Inventory
- Create products with name, SKU, category, price, compare-at price, description
- **Product types**: SIMPLE, DOWNLOADABLE (with download URL), VARIABLE
- **Multi-image** support: up to 4 images per product; first image is cover
- **Auto-SKU generation** from product name
- Image upload (JPG / PNG / WebP, max 2 MB) to **Supabase Storage** (`products` bucket)
- Per-product inventory with configurable low-stock alert threshold
- Inventory adjustment log
- Low-stock dashboard badge
- Category management page (`/dashboard/[slug]/categories`)

### Orders
- POS-style order creation: search products, set quantities, attach customers
- Order status flow: `PENDING` → `APPROVED` → `COMPLETED` / `CANCELLED`
- **Clickable rows** — click anywhere on a row to open the order detail modal
- Approve confirmation modal before status change; delete confirmation modal
- Inventory auto-decremented on order creation
- Order detail modal with full item and customer breakdown
- Email confirmation to customer with org branding (logo, org name)
- **Admin email notification** to the org owner when any new order is placed (dashboard or store)

### Logistics
- `/dashboard/[slug]/logistics` — OWNER/MANAGER only
- Shows all APPROVED orders as cards with customer contact info and item list
- "Mark delivered" button sets order to COMPLETED

### Customers
- Full customer records (name, email, phone, address)
- **View-detail modal**: click any customer row (or the eye icon) to see contact info, source, date added, and up to 5 recent orders
- Purchase history per customer
- Search by name or email

### Staff Management
- Email invitation with **3-day (72-hour) secure token**; cryptographically random 64-char hex token
- Role assignment on invite: MANAGER, CASHIER, or AUDITOR; OWNER is protected and cannot be assigned via invite
- **Pending invites** visible in the Staff table with amber badge; re-inviting a pending address is blocked at the API level (409 Conflict)
- **Cancel invite** action removes the pending invite and logs the cancellation in the audit trail
- **Lazy expiry**: when invites are fetched, newly-expired entries are auto-marked `EXPIRED` and logged
- **RESTRICT**: toggle staff access on/off; sends `accountRestrictedEmailTemplate` notification
- **RESET-PASSWORD**: generates temporary password; sends `passwordResetByAdminEmailTemplate` notification
- **DELETE**: removes staff from the organization; sends `staffRemovedEmailTemplate` notification; all three actions produce audit log entries
- Invite accept page: branded card UI with left-aligned content and eye icons on both password fields
- **Role-specific welcome modal** on first login: invited members see their role name and access scope; org owners see workspace setup instructions
- Account restriction / unrestriction with email notification; OWNER account cannot be restricted
- Admin-initiated password reset; OWNER password cannot be reset via staff tools

### Public Store
- Each org gets `/store/[slug]` as a public product catalog
- **Responsive**: mobile off-canvas drawer menu with category nav, cart/wishlist counts
- **Store navbar**: full-width logo (or text fallback), cart badge, wishlist badge, category tabs (desktop)
- **Store info section** below products: org name, description, and contact details linkable via `#store-info`
- Filters: keyword search, category (left sidebar), **dual price range slider** (min/max derived from actual product prices)
- **Sort bar**: Newest first, Oldest, Price (low→high / high→low), Name (A–Z)
- **Product cards**: hover image cycling, wishlist heart overlay, discount % badge; separate View / Add-to-cart / Wishlist actions; `object-contain` images
- **Product detail drawer**: image gallery with thumbnail strip, wishlist toggle, Add to cart
- **Wishlist**: localStorage + backend sync; email capture; reminder emails at 30min/2hr/1day/3days
- Cart with quantity controls; scroll-to-top button
- **Checkout**: breadcrumb navigation, arithmetic CAPTCHA security check, Paystack payment popup, `Secured by Paystack` badge
- **Paystack payment**: inline popup (no redirect), backend verification before order creation; successful payments create orders as `APPROVED`
- Confirmation email to customer on order placement

### Analytics Dashboard
- **Live clock** (HH:MM:SS) and timezone displayed next to the greeting and date — updates every second
- **Period filter** on charts: 7 / 30 / 90 days (applies to revenue, orders, and customer growth charts simultaneously)
- **Open Storefront** button — opens the public store in a new tab; shows a modal if the store is unpublished with a direct link to publish
- Revenue area chart, order growth area chart, customer growth line chart — all powered by live API data
- Low-stock alert banner when any product is at or below alert threshold
- **First-time welcome modal**: role-aware — owners see setup instructions; invited members see their role and access scope
- **Welcome-back modal** on every new session (sessionStorage-gated)

### Newsletter
- `/dashboard/[slug]/newsletter` — OWNER/MANAGER only
- Summary stats: total subscribers, last 7 days, this month
- Searchable subscriber table with status badges
- **CSV export** of all subscriber records
- Refresh button for live updates

### Reports
- **7 report types**: Revenue, Products, Orders, Customers, Inventory, Staff, **Payments** (new)
- Date-range filtering with empty-report guard (400 if no data in range)
- **PDF download**: landscape A4 via PDFKit; branded header (Traqify logo + org name + contact); coloured strip with report title and period; footer with record count + generation timestamp
- **Email report**: sends PDF as attachment via Nodemailer to the requesting user's email
- All report types accessible to AUDITOR and above; download/email restricted to OWNER/MANAGER
- PDF tagline: "Enterprise Store Management System"

### Audit Logs
- Every create / update / delete / login event logged with: user ID, organization ID, action type, entity name, entity ID, human-readable detail, IP address, user agent, and timestamp
- Captures: product creates/edits, order status changes, customer updates, staff invites sent/accepted/cancelled/expired, password changes, account restrictions, report exports
- Searchable and paginated; clickable rows navigate to a full detail page
- **Read/unread state** per log entry; bulk mark-read with confirmation modal
- **Notification bell** in topbar: shows latest 3 unread audit events; click navigates to detail
- Visible to OWNER and AUDITOR only

### Payment Tracking
- Record and track payments against orders with status flow: `PENDING` -> `COMPLETED` / `FAILED` / `REFUNDED`
- Payment fields: amount (NGN), method (cash, transfer, Paystack, etc.), reference, notes, order link
- Dashboard summary: total received, pending, failed, refunded — all with count badges
- Status filter; records paginated
- Inline update: click a payment to change its status with confirmation
- Fully audited: all payment creates and updates are logged

### Customer Records
- Full customer profiles: name, email, phone, address
- Source tracking: `MANUAL` (staff-created) vs `PURCHASE` (auto-created at checkout)
- Per-customer order history
- Search by name or email; add customer via modal overlay (no page navigation)

### Email System
Branded HTML templates for:
- OTP email verification
- Password reset
- Staff invitation
- Welcome email after verification
- Order confirmation (to customer, includes org contact details)
- Account restriction notice
- Admin-initiated password reset
- **Wishlist reminder** (4 waves: 30min, 2hr, 1 day, 3 days after wishlist creation)
- Store published/unpublished notification
- Report delivery

---

## Security Model

### Authentication layers

1. **OTP email verification** — every new account must verify their email before gaining access; the OTP is a 6-digit code with a 10-minute expiry and single-use enforcement
2. **bcrypt password hashing** — cost factor 12; no plain-text passwords stored anywhere
3. **JWT access token** — 7-day default lifetime; signed with `JWT_SECRET`; carries `userId`, `email`, `organizationId`, `role`
4. **JWT refresh token** — separate secret (`JWT_REFRESH_SECRET`); used by Axios interceptor to silently re-issue access tokens on 401
5. **Google OAuth 2.0** — redirect-based flow (server-side code exchange); Google accounts cannot log in with password and vice versa

### Authorization layers

- **`authenticate` middleware** — verifies the JWT on every protected route; attaches `req.user`
- **`requireOrg` middleware** — enforces that `req.user.organizationId` is set; prevents cross-org access
- **RBAC middleware** — four guards: `isOwnerOnly`, `isOwnerOrManager`, `isAtLeastAuditor`, `isAtLeastCashier`; applied per-route, not per-controller
- **Data-layer isolation** — all Prisma queries include `organizationId` in the `where` clause; no query trusts the frontend to scope data

### Rate limiting

Auth endpoints (`/api/auth/*`) are rate-limited via `express-rate-limit`:
- 10 requests per 15 minutes per IP on sensitive routes (login, register, OTP send)

### HTTP security headers

- `helmet` is applied globally: sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, and Content Security Policy headers

### File upload security

- Only `image/jpeg`, `image/png`, `image/webp` MIME types accepted (validated server-side)
- Max file size: 5 MB (enforced by Multer before the handler runs)
- Files stored in Supabase Storage (not the server filesystem); server never persists files to disk

### Password change policy (Settings)

- Requires the current password to be verified before accepting a new one
- New password cannot contain the user's email address (or email local part)
- New password cannot contain any segment of the user's display name (>2 chars)

### Staff invite security

- Invite tokens are 64-character cryptographically random hex strings (`crypto.randomBytes(32)`)
- Tokens expire after **3 days** (72 hours)
- Re-inviting a pending email address is blocked at the API level (409 Conflict)
- OWNER role cannot be assigned via invite; only MANAGER, CASHIER, AUDITOR
- Invite cancellation hard-deletes the token from the database; old links become immediately invalid

---

## Database Schema

```
User
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

Payment                                    -- v1.9.0+
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
  id, email, subscribedAt
```

---

## API Reference

All protected endpoints require `Authorization: Bearer <token>`.

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register with name, email, password |
| POST | `/verify-email` | Public | Verify OTP code |
| POST | `/send-otp` | Public | Resend OTP |
| POST | `/login` | Public | Email + password login |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/logout` | Auth | Invalidate refresh token |
| POST | `/forgot-password` | Public | Send reset link |
| POST | `/reset-password` | Public | Set new password via token |
| GET  | `/google-redirect` | Public | Redirect to Google consent screen |
| GET  | `/google-callback` | Public | Handle OAuth callback, issue JWT |
| GET  | `/me` | Auth | Get current user profile |
| PATCH | `/me` | Auth | Update name / avatarUrl |
| POST | `/change-password` | Auth | Change password (requires current password) |
| POST | `/upload-avatar` | Auth | Upload avatar to Supabase (`avatars` bucket) |

### Organizations (`/api/org` or `/api/organizations`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Auth | Create organization |
| GET  | `/:slug` | Auth + OrgMember | Get organization details |
| PATCH | `/:slug` | OWNER only | Update org settings |
| POST | `/:slug/upload-logo` | OWNER only | Upload logo to Supabase (`avatars` bucket) |
| GET  | `/:slug/store` | Public | Public store data (org + products + categories) |

### Categories (`/api/categories`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List categories for org |
| POST | `/` | MANAGER+ | Create category |
| PATCH | `/:id` | MANAGER+ | Update category |
| DELETE | `/:id` | OWNER only | Delete category |

### Store / Public (`/api/store`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:slug` | Public | Public store product list |
| POST | `/:slug/checkout` | Public | Guest checkout — creates order + sends email |
| POST | `/:slug/wishlist` | Public | Sync wishlist (sessionId + productIds + optional email) |

### Reports (`/api/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:type/pdf` | OWNER/MANAGER | Stream PDF report |
| POST | `/:type/email` | OWNER/MANAGER | Email PDF as attachment |

### Products (`/api/products`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Auth + OrgMember | List products |
| POST | `/` | MANAGER+ | Create product |
| PATCH | `/:id` | MANAGER+ | Update product |
| DELETE | `/:id` | MANAGER+ | Soft-delete product |
| POST | `/upload-image` | MANAGER+ | Upload product image to Supabase |

### Inventory (`/api/inventory`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List inventory items |
| PATCH | `/:productId` | MANAGER+ | Adjust stock / alert threshold |

### Orders (`/api/orders`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List orders (paginated, filterable by status) |
| POST | `/` | CASHIER+ | Create order |
| GET | `/:id` | Auth | Get order detail |
| PATCH | `/:id/status` | MANAGER+ | Update order status (PENDING/APPROVED/COMPLETED/CANCELLED) |
| DELETE | `/:id` | OWNER only | Delete order |

### Customers (`/api/customers`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List customers |
| POST | `/` | CASHIER+ | Create customer |
| GET | `/:id` | Auth | Get customer + order history |
| PATCH | `/:id` | MANAGER+ | Update customer |

### Staff (`/api/staff`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Auth + OrgMember | List staff members |
| GET | `/invites` | MANAGER+ | List all pending/expired invites |
| POST | `/invite` | MANAGER+ | Send staff invitation (3-day token) |
| DELETE | `/invites/:inviteId` | MANAGER+ | Cancel a pending invite |
| GET | `/invite/:token` | Public | Fetch invite details (for accept page) |
| PATCH | `/:userId/role` | OWNER only | Change a staff member's role |
| PATCH | `/:userId/access` | MANAGER+ | Toggle account restriction |
| DELETE | `/:userId` | OWNER only | Remove staff member from org |
| POST | `/:userId/reset-password` | MANAGER+ | Admin-initiated password reset email |

### Payments (`/api/payments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | AUDITOR+ | List payments (filterable by status) |
| GET | `/:id` | AUDITOR+ | Get single payment record |
| POST | `/` | MANAGER+ | Record a payment |
| PATCH | `/:id` | MANAGER+ | Update payment status |

### Reviews (`/api/reviews`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Public | Submit a review (post-purchase) |
| GET | `/product/:productId` | Public | List approved reviews for a product |
| GET | `/` | MANAGER+ | Dashboard: list all reviews for org |
| PATCH | `/:id/moderate` | MANAGER+ | Approve or reject a review |
| DELETE | `/:id` | MANAGER+ | Delete a review |

### Reports (`/api/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/overview` | AUDITOR+ | KPI summary (revenue, orders, products, customers, low-stock) |
| GET | `/revenue-chart` | AUDITOR+ | Daily revenue for last N days |
| GET | `/customer-chart` | AUDITOR+ | Daily new customers for last N days |
| GET | `/top-products` | AUDITOR+ | Top products by revenue |
| GET | `/sales` | AUDITOR+ | Date-range sales tabular data |
| GET | `/download` | MANAGER+ | Stream PDF report (type + date range) |
| POST | `/email` | MANAGER+ | Email PDF report as attachment |

### Audit Logs (`/api/audit` or `/api/audit-logs`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | AUDITOR+ | Paginated audit log with search |
| GET | `/unread-count` | AUDITOR+ | Count of unread log entries |
| GET | `/:id` | AUDITOR+ | Single log entry (marks it read) |
| PATCH | `/mark-read` | AUDITOR+ | Bulk mark read/unread (`ids[]`, `all`, `isRead`) |

### Public Store (`/api/store`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:slug` | Public | Store info + product catalog |
| POST | `/:slug/checkout` | Public | Place guest order + Paystack verification |
| POST | `/:slug/wishlist` | Public | Sync wishlist (sessionId + productIds + email) |

### Newsletter (`/api/newsletter`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/subscribe` | Public | Subscribe to newsletter |
| GET | `/subscribers` | OWNER/MANAGER | List all newsletter subscribers |

---

## Folder Structure

```
traqify/
+-- README.md
+-- LICENSE
+-- CHANGELOG.md
+-- WIKI.md
+-- .gitignore
|
+-- backend/
|   +-- DEPLOY.md
|   +-- vercel.json
|   +-- .env.example
|   +-- package.json
|   +-- tsconfig.json
|   +-- prisma/
|   |   +-- schema.prisma         # All 11 models
|   +-- src/
|       +-- index.ts              # Express app bootstrap, CORS, rate-limit, route mounts
|       +-- config/
|       |   +-- database.ts       # Prisma client singleton
|       |   +-- email.ts          # Nodemailer transporter
|       |   +-- supabase.ts       # Supabase client (storage access)
|       +-- middleware/
|       |   +-- auth.middleware.ts     # JWT verify, attach user to req
|       |   +-- rbac.middleware.ts     # Role-based access guards
|       |   +-- error.middleware.ts    # Global error handler
|       +-- routes/
|       |   +-- auth.routes.ts
|       |   +-- org.routes.ts
|       |   +-- product.routes.ts
|       |   +-- inventory.routes.ts
|       |   +-- order.routes.ts
|       |   +-- customer.routes.ts
|       |   +-- staff.routes.ts
|       |   +-- report.routes.ts
|       |   +-- audit.routes.ts
|       |   +-- store.routes.ts
|       |   +-- newsletter.routes.ts
|       +-- controllers/          # One controller per route module
|       +-- emails/
|       |   +-- templates.ts      # Branded HTML email templates
|       +-- utils/
|           +-- jwt.ts            # sign / verify / refresh
|           +-- otp.ts            # OTP create/verify, password-reset tokens
|           +-- slug.ts           # Unique org slug generator
|           +-- audit.ts          # createAuditLog() helper
|           +-- validators.ts     # All Zod schemas
|
+-- frontend/
    +-- DEPLOY.md
    +-- .env.local.example
    +-- next.config.mjs
    +-- tailwind.config.ts
    +-- package.json
    +-- tsconfig.json
    +-- public/
    |   +-- img-hero.jpg
    |   +-- google-logo.png
    |   +-- payments.png
    +-- app/
    |   +-- layout.tsx            # Root layout: AuthProvider, Toaster, ScrollToTop
    |   +-- page.tsx              # Landing page (assembly of all sections)
    |   +-- globals.css           # Tailwind base + Jost font + CSS keyframes
    |   +-- not-found.tsx
    |   +-- (auth)/
    |   |   +-- layout.tsx
    |   |   +-- login/page.tsx
    |   |   +-- register/page.tsx      # 3-step registration with password strength
    |   |   +-- verify-email/page.tsx  # 6-digit OTP input
    |   |   +-- forgot-password/page.tsx
    |   |   +-- reset-password/page.tsx
    |   |   +-- auth-callback/page.tsx # Google OAuth landing
    |   +-- (public)/
    |   |   +-- privacy/page.tsx
    |   |   +-- terms/page.tsx
    |   +-- create-organization/page.tsx  # Post-registration org setup
    |   +-- invite/[token]/page.tsx       # Accept staff invitation
    |   +-- store/[slug]/page.tsx         # Public catalog + cart + dual price range slider
    |   +-- store/[slug]/checkout/page.tsx # Paystack checkout + CAPTCHA + breadcrumb
    |   +-- store/[slug]/products/[id]/page.tsx # Individual product page with upsells
    |   +-- dashboard/[slug]/
    |       +-- layout.tsx               # Auth guard + sidebar layout
    |       +-- overview/page.tsx        # Role-based Recharts dashboard
    |       +-- products/page.tsx
    |       +-- products/new/page.tsx      # Full-page product creation with Zod validation
    |       +-- inventory/page.tsx
    |       +-- orders/page.tsx
    |       +-- customers/page.tsx
    |       +-- staff/page.tsx
    |       +-- reports/page.tsx
    |       +-- audit-logs/page.tsx
    |       +-- settings/page.tsx        # Org tab: industry/size/description/phone/address/website
    |       +-- newsletter/page.tsx      # Subscriber stats + searchable table + CSV export
    +-- components/
    |   +-- landing/
    |   |   +-- hero.tsx          # 2-col hero, image first on mobile
    |   |   +-- logo-scroller.tsx # Infinite scroll on black bg
    |   |   +-- about.tsx         # 2-col with animated dashboard mockup
    |   |   +-- features.tsx      # 8-card feature grid
    |   |   +-- stats.tsx         # Animated counters on dark bg
    |   |   +-- how-it-works.tsx  # Framer Motion timeline
    |   |   +-- testimonials.tsx  # Dual scrolling rows
    |   |   +-- everything.tsx    # Role comparison cards
    |   |   +-- faq.tsx           # 2-column accordion
    |   |   +-- cta.tsx           # Red CTA with gradient glow
    |   +-- shared/
    |   |   +-- navbar.tsx        # Scroll spy + animated red underline
    |   |   +-- footer.tsx        # Newsletter, socials, legal links
    |   |   +-- logo.tsx
    |   |   +-- scroll-to-top.tsx
    |   |   +-- error-modal.tsx
    |   +-- dashboard/
    |   |   +-- sidebar.tsx
    |   |   +-- topbar.tsx
    |   |   +-- product-modal.tsx     # Create/edit with image upload
    |   |   +-- create-order-modal.tsx
    |   |   +-- order-detail-modal.tsx
    |   +-- ui/                   # Button, Input, Label, Card, Badge, Toast
    +-- lib/
    |   +-- api.ts                # Axios instance with JWT + silent token refresh
    |   +-- auth-context.tsx      # AuthProvider, useAuth() hook
    |   +-- supabase.ts           # Supabase browser client
    |   +-- utils.ts              # cn(), formatCurrency(), INDUSTRY_OPTIONS
    +-- hooks/
        +-- use-toast.ts
```

---

## Running Locally

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- A free [Supabase](https://supabase.com) project (PostgreSQL + Storage)
- A Gmail account with [App Password](https://support.google.com/accounts/answer/185833) enabled
- A Google Cloud project with OAuth 2.0 Web Client credentials

---

### Step 1: Clone the repository

```bash
git clone https://github.com/oyedokunken/traqify.git
cd traqify
```

---

### Step 2: Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in the following (see [Environment Variables](#environment-variables) for the full list):

- `DATABASE_URL` and `DIRECT_URL` from Supabase > Project Settings > Database > Connection string
- `SMTP_USER` and `SMTP_PASS` (your Gmail address and 16-char App Password)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud Console
- `JWT_SECRET` and `JWT_REFRESH_SECRET` (any two long random strings, keep them secret)

Push the schema to your database:

```bash
npx prisma db push
```

Start the backend dev server:

```bash
npm run dev
```

The API will be available at **http://localhost:5000** (local) or **https://traqify-api.vercel.app/** (production). You can verify it is running:

```bash
curl https://traqify-api.vercel.app/health
# { "status": "ok", ... }
```

---

### Step 3: Set up the frontend

Open a new terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Start the frontend:

```bash
npm run dev
```

The app will be available at **http://localhost:3000** (local) or **https://traqify.vercel.app/** (production).

---

### Step 4: Create your first account

1. Open http://localhost:3000/register
2. Fill in your name, email, and password
3. Enter your organization details
4. Check your email for the OTP code
5. Verify your email
6. Sign in at http://localhost:3000/login
7. You will be redirected to set up your organization at http://localhost:3000/create-organization

---

### Step 5: Explore

| URL | Description |
|-----|-------------|
| https://traqify.vercel.app | Landing page (production) |
| https://traqify.vercel.app/register | Create an account |
| https://traqify.vercel.app/login | Sign in |
| https://traqify.vercel.app/create-organization | Org setup (post-registration) |
| https://traqify.vercel.app/dashboard/[slug]/overview | Dashboard home |
| https://traqify.vercel.app/dashboard/[slug]/products | Products |
| https://traqify.vercel.app/dashboard/[slug]/orders | Orders |
| https://traqify.vercel.app/dashboard/[slug]/staff | Staff management |
| https://traqify.vercel.app/store/[slug] | Public store page |
| http://localhost:3000 | Landing page (local) |

---

## Environment Variables

### `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase pooled connection string |
| `DIRECT_URL` | Yes | Supabase direct connection string (for migrations) |
| `PORT` | No | API port (default: 5000) |
| `NODE_ENV` | Yes | `development` or `production` |
| `API_URL` | Yes | Full base URL of this API server |
| `FRONTEND_URL` | Yes | Full base URL of the frontend (for CORS + email links) |
| `JWT_SECRET` | Yes | Long random string for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Different long random string for refresh tokens |
| `JWT_EXPIRES_IN` | No | Access token lifetime (default: `7d`) |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for storage writes) |
| `SMTP_HOST` | Yes | SMTP host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | Yes | SMTP port (e.g. `587`) |
| `SMTP_USER` | Yes | SMTP username (your Gmail address) |
| `SMTP_PASS` | Yes | Gmail App Password (16 characters) |
| `SMTP_FROM` | Yes | From header, e.g. `"Traqify <you@gmail.com>"` |
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 client ID from Google Console |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 client secret |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack secret key (verify payments server-side) |
| `PAYSTACK_PUBLIC_KEY` | No | Paystack public key (also set in frontend env) |

### `frontend/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Paystack public key (used by inline popup) |

---

## Google OAuth Setup

This step is required to enable "Continue with Google" on the login and register pages.

1. Go to [Google Cloud Console](https://console.cloud.google.com) and select your project
2. Navigate to **APIs & Services > Credentials**
3. Click **Create Credentials > OAuth 2.0 Client IDs > Web application**
4. Under **Authorized JavaScript Origins**, add:

```
http://localhost:3000
```

5. Under **Authorized Redirect URIs**, add:

```
https://traqify-api.vercel.app/api/auth/google-callback
```

6. Save and copy the **Client ID** and **Client Secret** into `backend/.env`
7. Wait up to 5 minutes for changes to propagate

For production, also add:
- `https://traqify.vercel.app` to JavaScript Origins
- `https://traqify-api.vercel.app/api/auth/google-callback` to Redirect URIs

---

## Deployment

See the step-by-step guides:
- [frontend/DEPLOY.md](frontend/DEPLOY.md) for deploying the Next.js app to Vercel
- [backend/DEPLOY.md](backend/DEPLOY.md) for deploying the Express API to Vercel

---

## Enterprise Readiness Assessment

Traqify is purpose-built with enterprise patterns. Here is an honest assessment of where it stands and where it can grow.

### Strengths

| Concern | Implementation |
|---------|----------------|
| **Multi-tenancy** | All queries scoped by `organizationId` at the ORM layer; no cross-org data leakage possible |
| **RBAC** | 4-tier role hierarchy enforced via dedicated Express middleware per route; not just UI-level hiding |
| **Audit trail** | Every state-changing action generates an `AuditLog` row with actor, entity, IP, user agent, and timestamp |
| **Auth security** | bcrypt (cost 12) + OTP verification + JWT access/refresh pair + Google OAuth; rate-limited auth endpoints |
| **HTTP hardening** | Helmet headers + per-route rate limiting via `express-rate-limit` |
| **File security** | MIME-type validation + size caps + Supabase Storage (not local disk) |
| **Type safety** | 100% TypeScript (strict) across frontend and backend; Prisma ORM for compile-time query safety |
| **Email reliability** | Nodemailer with branded templates; transactional emails for OTP, invites, orders, reports, restrictions |
| **Structured reports** | Downloadable and emailable PDF reports (7 types) with org branding |
| **Public storefront** | Separate customer-facing catalog with Paystack checkout, wishlist reminders, and product reviews |
| **Staff lifecycle** | Invite → accept → restrict → remove; full audit log at every step |

### Known Limitations

| Area | Current State | Enterprise Upgrade Path |
|------|--------------|-------------------------|
| **Password history** | Not enforced (current vs new password checked, but no history log) | Add `PasswordHistory` model; hash-compare last N passwords |
| **MFA / 2FA** | Not implemented | TOTP (Google Authenticator) or SMS via Twilio |
| **Session management** | Stateless JWT; no server-side session store | Add Redis for token blocklisting on logout/restriction |
| **Background jobs** | Wishlist reminders use a simulated delay model; invite expiry is lazy (on-read) | Proper cron/queue (BullMQ + Redis) for scheduled tasks |
| **Horizontal scaling** | Single Express instance per Vercel function | Stateless architecture already; add Redis for shared state |
| **Webhook events** | No outbound webhooks | Add a `WebhookEndpoint` model + `POST` delivery queue |
| **API versioning** | No `/v1/` prefix | Add version prefix before any public API consumers |
| **Unit / integration tests** | Not yet written | Jest + Supertest for backend; Playwright for E2E |
| **Database migrations** | Uses `prisma db push` (schema-level diff) | Switch to `prisma migrate deploy` for CI/CD controlled migrations |
| **Observability** | `console.error` logging only | Add structured logging (Pino) + error tracking (Sentry) |

---

## License

MIT. See [LICENSE](LICENSE).

---

## Author

**Oyedokun Kehinde**
Software Engineer

- Email: [oyedokunken@gmail.com](mailto:oyedokunken@gmail.com)
- WhatsApp: [+2348028134942](https://wa.link/nv875h)
- GitHub: [@oyedokunken](https://github.com/oyedokunken)