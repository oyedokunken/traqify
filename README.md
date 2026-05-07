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

Traqify is a production-grade, multi-tenant store management platform designed for retail businesses that need structure and clarity across their operations. Built as a full-stack TypeScript monorepo, it handles everything from product management and order processing to staff permissions, customer records, public-facing storefronts, and real-time analytics.

The system follows a clean **separation of concerns** between a Next.js 14 App Router frontend and a RESTful Express.js backend, connected via a JWT-authenticated Axios client with automatic token refresh.

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
  Email/Password:
    POST /register -> OTP email -> POST /verify-email -> JWT issued
    POST /login -> compare bcrypt -> JWT + refresh token

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
| Font | Jost | Google Fonts |

---

## Features

### Multi-tenancy
Each organization is completely isolated. Users belong to one organization (or none), and all data queries are scoped by `organizationId`. The system supports creating separate organizations per branch.

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
- Image upload (JPG / PNG / WebP, max 2 MB) to Supabase Storage
- Per-product inventory with configurable low-stock alert threshold
- Inventory adjustment log
- Low-stock dashboard badge

### Orders
- POS-style order creation: search products, set quantities, attach customers
- Order status machine: `PENDING` > `PROCESSING` > `COMPLETED` / `CANCELLED` / `REFUNDED`
- Inventory auto-decremented on order creation
- Order detail modal with full item and customer breakdown
- Email confirmation to customer

### Customers
- Full customer records (name, email, phone, address)
- Purchase history per customer
- Search by name or email

### Staff Management
- Email invitation with 48-hour secure token
- Role assignment on invite (MANAGER, CASHIER, AUDITOR)
- Account restriction / unrestriction by Owner
- Admin-initiated password reset

### Public Store
- Each org gets `/store/[slug]` as a public product catalog
- Filters: keyword search, category, sort (newest / price / name), in-stock toggle
- Cart with quantity controls
- Guest checkout: name, email, phone, address, payment method, notes
- Confirmation email to customer on order placement

### Analytics Dashboard
- Role-aware overview page with Recharts:
  - **OWNER / MANAGER**: revenue KPIs, 30-day area chart, top-10 products bar chart
  - **AUDITOR**: revenue KPIs, order-status pie chart
  - **CASHIER**: order count and product count only
- All charts have proper empty states

### Reports
- Date-range sales report with total revenue, order count, item list
- PDF print from browser with org name and branding

### Audit Logs
- Every create / update / delete / login event logged with user, entity, and timestamp
- Searchable and paginated
- Visible to OWNER and AUDITOR only

### Email System
Branded HTML templates for:
- OTP email verification
- Password reset
- Staff invitation
- Welcome email after verification
- Order confirmation (to customer)
- Account restriction notice
- Admin-initiated password reset

---

## Database Schema

```
User
  id, email, name, password (bcrypt), avatarUrl
  emailVerified, signInMethod (EMAIL|GOOGLE)
  role (OWNER|MANAGER|CASHIER|AUDITOR)
  organizationId (FK -> Organization)
  lastLoginAt, isRestricted

Organization
  id, name, slug (unique), email, phone, address
  industry, size, logoUrl
  ownerId (FK -> User)

Product
  id, name, sku (unique per org), category
  price, comparePrice, description, imageUrl
  isActive, organizationId

Inventory
  id, quantity, lowStockAlert
  productId (1:1 -> Product)

Order
  id, status, totalAmount, paymentMethod, notes
  customerId, organizationId, createdByUserId

OrderItem
  id, productId, quantity, unitPrice, subtotal
  orderId

Customer
  id, name, email, phone, address
  organizationId

StaffInvite
  id, email, role, token (unique), accepted
  expiresAt, organizationId, invitedByUserId

OTPCode
  id, email, code, expiresAt, used

PasswordResetToken
  id, email, token, expiresAt, used

AuditLog
  id, userId, organizationId
  action (CREATE|UPDATE|DELETE|LOGIN)
  entity, entityId, description
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
| POST | `/forgot-password` | Public | Send reset link (returns 404 if email not found) |
| POST | `/reset-password` | Public | Set new password via token |
| GET  | `/google-redirect` | Public | Redirect to Google consent screen |
| GET  | `/google-callback` | Public | Handle OAuth callback, issue JWT |
| GET  | `/me` | Auth | Get current user profile |
| PATCH | `/me` | Auth | Update name / avatarUrl |
| POST | `/change-password` | Auth | Change password (requires current password) |

### Organizations (`/api/org` or `/api/organizations`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Auth | Create organization |
| GET  | `/:slug` | Auth + OrgMember | Get organization details |
| PATCH | `/:slug` | OWNER only | Update org settings |

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
| GET | `/` | Auth | List orders (paginated, filterable) |
| POST | `/` | CASHIER+ | Create order |
| GET | `/:id` | Auth | Get order detail |
| PATCH | `/:id/status` | MANAGER+ | Update order status |

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
| GET | `/` | Auth | List staff members |
| POST | `/invite` | MANAGER+ | Send staff invitation |
| POST | `/accept-invite` | Public | Accept invitation via token |
| PATCH | `/:id/restrict` | OWNER only | Restrict / unrestrict account |
| POST | `/:id/reset-password` | OWNER only | Admin password reset |

### Reports (`/api/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/overview` | Auth | KPI summary (revenue, orders, products) |
| GET | `/revenue-chart` | Auth | Daily revenue for last N days |
| GET | `/top-products` | Auth | Top products by revenue |
| GET | `/order-status` | Auth | Order count by status |
| GET | `/sales` | AUDITOR+ | Date-range sales report |

### Audit Logs (`/api/audit`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | OWNER / AUDITOR | Paginated audit log with search |

### Public Store (`/api/store`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:slug` | Public | Store info + product catalog |
| POST | `/:slug/checkout` | Public | Place guest order |

### Newsletter (`/api/newsletter`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/subscribe` | Public | Subscribe to newsletter |

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
    |   +-- store/[slug]/page.tsx         # Public catalog + cart + checkout
    |   +-- dashboard/[slug]/
    |       +-- layout.tsx               # Auth guard + sidebar layout
    |       +-- overview/page.tsx        # Role-based Recharts dashboard
    |       +-- products/page.tsx
    |       +-- inventory/page.tsx
    |       +-- orders/page.tsx
    |       +-- customers/page.tsx
    |       +-- staff/page.tsx
    |       +-- reports/page.tsx
    |       +-- audit-logs/page.tsx
    |       +-- settings/page.tsx
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

The API will be available at **http://localhost:5000**. You can verify it is running:

```bash
curl http://localhost:5000/health
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

The app will be available at **http://localhost:3000**.

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
| http://localhost:3000 | Landing page |
| http://localhost:3000/register | Create an account |
| http://localhost:3000/login | Sign in |
| http://localhost:3000/create-organization | Org setup (post-registration) |
| http://localhost:3000/dashboard/[slug]/overview | Dashboard home |
| http://localhost:3000/dashboard/[slug]/products | Products |
| http://localhost:3000/dashboard/[slug]/orders | Orders |
| http://localhost:3000/dashboard/[slug]/staff | Staff management |
| http://localhost:3000/store/[slug] | Public store page |

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

### `frontend/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |

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
http://localhost:5000/api/auth/google-callback
```

6. Save and copy the **Client ID** and **Client Secret** into `backend/.env`
7. Wait up to 5 minutes for changes to propagate

For production, also add:
- `https://your-frontend.vercel.app` to JavaScript Origins
- `https://your-backend.vercel.app/api/auth/google-callback` to Redirect URIs

---

## Deployment

See the step-by-step guides:
- [frontend/DEPLOY.md](frontend/DEPLOY.md) for deploying the Next.js app to Vercel
- [backend/DEPLOY.md](backend/DEPLOY.md) for deploying the Express API to Vercel

---

## License

MIT. See [LICENSE](LICENSE).