# Traqify

**Traqify** is a multi-tenant store management platform for retail businesses. It lets store owners, managers, cashiers, and auditors each access the exact tools they need — no clutter, no confusion.

Built as a full-stack TypeScript application with a Next.js frontend and an Express backend, it covers everything from product and inventory management to public-facing store catalogs and role-based analytics.

---

## Features

### Core Platform
- **Multi-tenant organizations** — each business gets its own isolated environment with a unique URL slug
- **Role-based access control (RBAC)** — four roles with distinct permissions: Owner, Manager, Cashier, Auditor
- **JWT authentication** — access tokens + refresh tokens, with automatic refresh on 401
- **OTP email verification** — 6-digit code sent on registration, expires in 10 minutes
- **Google OAuth 2.0** — redirect-based sign-in, no popups

### Product and Inventory
- Add products with name, SKU, category, price, compare price, description, and image
- Image upload with type validation (JPG, PNG, WebP) and 2MB size limit
- Inventory tracking per product with configurable low-stock alert thresholds
- Stock adjustment history and low-stock dashboard alert

### Orders
- POS-style order creation — search products, set quantities, link customers
- Order status flow: Pending, Processing, Completed, Cancelled, Refunded
- Order detail modal with full item breakdown and customer info
- Inventory decremented automatically on order creation

### Customers
- Customer records with name, email, phone, and address
- Full purchase history per customer
- Search by name or email

### Staff Management
- Email-based staff invitations with secure token (48-hour expiry)
- Role assignment on invite
- Account restriction and unrestriction by Owner
- Password reset by admin

### Public Store
- Each organization gets a public product catalog at `/store/[slug]`
- Filters: search, category, sort (newest, price, name), in-stock only
- Shopping cart with quantity controls
- Guest checkout — name, email, phone, address, payment method, notes
- Automatic order confirmation email to customer

### Dashboard and Analytics
- Role-based dashboard overview
  - **Owner and Manager**: Revenue KPI, revenue trend (area chart), top products (bar chart)
  - **Auditor**: Revenue KPI, order status breakdown (pie chart)
  - **Cashier**: Order and product counts only
- All charts built with Recharts, with proper empty states

### Reports
- Date-range sales report with total revenue, item count, and order list
- PDF print from browser with organization branding

### Audit Logs
- Every create, update, delete, and login event logged
- Filterable by search with pagination
- Visible to Owner and Auditor roles

### Email
- HTML email templates for: OTP verification, password reset, staff invitation, welcome message, account restriction, admin password reset
- Sent via Gmail SMTP using Nodemailer

### Landing Page
- Hero section, scrolling logo marquee (black bg), about section with animated dashboard preview
- Features grid, animated stats, how-it-works timeline, scrolling testimonials
- Role-based feature breakdown, two-column FAQ, CTA section
- Full footer with newsletter subscription, social links, and payment method icons

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI Components | Radix UI, shadcn/ui primitives |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Express.js, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt + Google OAuth 2.0 |
| File Storage | Supabase Storage |
| Email | Nodemailer + Gmail SMTP |
| Font | Jost (Google Fonts) |

---

## Project Structure

```
traqify/
  backend/
    prisma/           Prisma schema and migrations
    src/
      config/         Database, email, Supabase clients
      controllers/    Route handlers
      emails/         HTML email templates
      middleware/     Auth guard, RBAC, error handler
      routes/         Express routers
      utils/          JWT, OTP, slug, audit, validators
    .env              Environment variables (not committed)
  frontend/
    app/              Next.js App Router pages
    components/
      dashboard/      Dashboard-specific components
      landing/        Landing page sections
      shared/         Navbar, Footer, Logo, ScrollToTop
      ui/             Button, Input, Card, Badge, Toast
    lib/              API client, auth context, utils
    public/           Static assets (images, icons)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Gmail account with App Password enabled for SMTP

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npx prisma db push
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

PORT=5000
NODE_ENV=development
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=7d

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Traqify <your@gmail.com>"

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create an OAuth 2.0 Web Application client
3. Add to **Authorized JavaScript Origins**:
   - `http://localhost:3000`
   - `https://your-frontend-domain.vercel.app`
4. Add to **Authorized Redirect URIs**:
   - `http://localhost:5000/api/auth/google-callback`
   - `https://your-backend-domain.vercel.app/api/auth/google-callback`

---

## Deployment

See [frontend/DEPLOY.md](frontend/DEPLOY.md) and [backend/DEPLOY.md](backend/DEPLOY.md) for step-by-step Vercel deployment guides.

---

## License

MIT — see [LICENSE](LICENSE).
