# Traqify

> Multi-tenant store management platform for retail businesses.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animation-EE4B96?logo=framer&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-Charts-22B5BF?logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-F7C948?logo=jsonwebtokens&logoColor=black)
![Google OAuth](https://img.shields.io/badge/Google_OAuth-2.0-4285F4?logo=google&logoColor=white)

Traqify gives store owners, managers, cashiers, and auditors each the exact tools they need. Built as a full-stack TypeScript application, it covers product and inventory management, orders, staff, analytics, and a public-facing store catalog.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| UI Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Radix UI / shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend Framework | Express.js 4 |
| ORM | Prisma |
| Database | PostgreSQL via Supabase |
| Auth | JWT + bcrypt + Google OAuth 2.0 |
| File Storage | Supabase Storage |
| Email | Nodemailer + Gmail SMTP |
| Deployment | Vercel (frontend + backend) |

---

## Features

- **Multi-tenant organizations** with isolated data per business
- **Role-based access control**: Owner, Manager, Cashier, Auditor
- **JWT authentication** with refresh tokens and OTP email verification
- **Google OAuth 2.0** redirect-based sign-in
- **Product management** with image upload (JPG/PNG/WebP, max 2MB)
- **Inventory tracking** with low-stock alerts
- **POS-style order creation** with automatic inventory decrement
- **Customer records** with full purchase history
- **Staff invitations** via email with role assignment
- **Public store page** per organization with cart and guest checkout
- **Role-based analytics dashboard** (Area, Bar, Pie charts via Recharts)
- **PDF-printable sales reports** with date range filters
- **Audit logs** for every team action
- **HTML email templates** for OTP, password reset, invites, order confirmation
- **Newsletter subscription** with confirmation email
- **Fully responsive** landing page and dashboard

---

## System Architecture

```
                          +------------------+
     Browser / Mobile --> |   Next.js 14     |  :3000
                          |  (App Router)    |
                          +--------+---------+
                                   |
                          HTTP (Axios + JWT)
                                   |
                          +--------v---------+
                          |   Express.js     |  :5000
                          |   REST API       |
                          +----+--------+----+
                               |        |
               +---------------+        +-------------------+
               |                                            |
     +---------v----------+                    +-----------v----------+
     |  Prisma ORM        |                    |  Supabase Storage    |
     |  PostgreSQL        |                    |  (Product Images)    |
     |  (Supabase)        |                    +----------------------+
     +--------------------+
               |
     +---------v----------+
     |  Nodemailer        |
     |  Gmail SMTP        |
     |  (Emails)          |
     +--------------------+

  Auth Flow:
  - Email/Password: Register -> OTP Email -> Verify -> JWT
  - Google OAuth: /google-redirect -> Google -> /google-callback -> JWT
  - All protected routes: Bearer token in Authorization header
  - Token refresh: Axios interceptor catches 401, calls /api/auth/refresh
```

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
|   |   +-- schema.prisma          # All models: User, Organization, Product, Inventory,
|   |                              #   Order, OrderItem, Customer, StaffInvite, AuditLog,
|   |                              #   PasswordResetToken, OTPCode, NewsletterSubscriber
|   +-- src/
|       +-- index.ts               # Express server, CORS, routes mount
|       +-- config/
|       |   +-- database.ts        # Prisma client
|       |   +-- email.ts           # Nodemailer transporter
|       |   +-- supabase.ts        # Supabase client (storage)
|       +-- middleware/
|       |   +-- auth.middleware.ts # JWT verification
|       |   +-- rbac.middleware.ts # Role-based access guard
|       |   +-- error.middleware.ts
|       +-- routes/                # auth, org, product, inventory, order,
|       |                          #   customer, staff, report, audit, store, newsletter
|       +-- controllers/           # Handler for each route module
|       +-- emails/
|       |   +-- templates.ts       # HTML email templates (branded)
|       +-- utils/
|           +-- jwt.ts             # sign/verify tokens
|           +-- otp.ts             # OTP create/verify, password reset tokens
|           +-- slug.ts            # Unique org slug generator
|           +-- audit.ts           # Audit log helper
|           +-- validators.ts      # Zod schemas
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
    |   +-- layout.tsx             # Root layout (AuthProvider, Toaster, ScrollToTop)
    |   +-- page.tsx               # Landing page
    |   +-- globals.css            # Tailwind + Jost font + scroll keyframes
    |   +-- not-found.tsx
    |   +-- (auth)/                # login, register, verify-email, forgot-password,
    |   |                          #   reset-password, auth-callback
    |   +-- (public)/              # privacy, terms
    |   +-- create-organization/
    |   +-- invite/[token]/
    |   +-- store/[slug]/          # Public product catalog + cart + checkout
    |   +-- dashboard/[slug]/
    |       +-- layout.tsx         # Auth guard (redirects if not logged in)
    |       +-- overview/          # Role-based Recharts dashboard
    |       +-- products/
    |       +-- inventory/
    |       +-- orders/
    |       +-- customers/
    |       +-- staff/
    |       +-- reports/
    |       +-- audit-logs/
    |       +-- settings/
    +-- components/
    |   +-- landing/               # hero, about, logo-scroller, features, stats,
    |   |                          #   how-it-works, testimonials, everything, faq, cta
    |   +-- shared/                # Navbar, Footer, Logo, ScrollToTop, ErrorModal
    |   +-- dashboard/             # Sidebar, Topbar, ProductModal,
    |   |                          #   CreateOrderModal, OrderDetailModal
    |   +-- ui/                    # Button, Input, Label, Card, Badge, Toast
    +-- lib/
    |   +-- api.ts                 # Axios instance with JWT + refresh interceptor
    |   +-- auth-context.tsx       # AuthProvider (user state, login/logout)
    |   +-- supabase.ts            # Supabase client (browser)
    |   +-- utils.ts               # cn(), formatCurrency(), INDUSTRY_OPTIONS
    +-- hooks/
        +-- use-toast.ts
```

---

## Running the App Locally

### Requirements

- Node.js 18 or higher
- A PostgreSQL database (free Supabase project works)
- A Gmail account with [App Password](https://support.google.com/accounts/answer/185833) enabled
- A Google Cloud project with OAuth 2.0 credentials

---

### 1. Clone the repository

```bash
git clone https://github.com/oyedokunken/traqify.git
cd traqify
```

---

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file (copy from `.env.example` and fill in your values):

```bash
cp .env.example .env
```

Key values to set:
- `DATABASE_URL` and `DIRECT_URL` from your Supabase project settings under **Database > Connection string**
- `SMTP_USER` and `SMTP_PASS` (Gmail address + App Password)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud Console
- `JWT_SECRET` and `JWT_REFRESH_SECRET` (any long random strings)

Push the database schema:

```bash
npx prisma db push
```

Start the backend:

```bash
npm run dev
```

Backend runs at **http://localhost:5000**

---

### 3. Set up the frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```bash
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

Frontend runs at **http://localhost:3000**

---

### 4. Google OAuth setup (for "Continue with Google")

In [Google Cloud Console](https://console.cloud.google.com):

1. Go to **APIs & Services > Credentials**
2. Open your OAuth 2.0 Web client
3. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:5000/api/auth/google-callback
   ```
4. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:3000
   ```
5. Save and wait up to 5 minutes for changes to propagate

---

### 5. Open the app

| URL | Page |
|-----|------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/register | Create an account |
| http://localhost:3000/login | Sign in |
| http://localhost:3000/dashboard/[slug]/overview | Dashboard |
| http://localhost:3000/store/[slug] | Public store |

---

## Deployment

See [frontend/DEPLOY.md](frontend/DEPLOY.md) and [backend/DEPLOY.md](backend/DEPLOY.md) for step-by-step Vercel deployment guides.

---

## License

MIT. See [LICENSE](LICENSE).